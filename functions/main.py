import hashlib
from multiprocessing.pool import ThreadPool
import os
import re
import itertools
import base64
from typing import List
import json
from transformers import AutoTokenizer, AutoModelForTokenClassification
from transformers import pipeline
from firebase_admin import firestore, initialize_app
from google.cloud.firestore import ArrayUnion, WriteBatch
import functions_framework
import pinecone
import urllib.parse

device = "cpu"

model_id = "dslim/bert-base-NER"

# load the tokenizer from huggingface
tokenizer = AutoTokenizer.from_pretrained(model_id)
# load the NER model from huggingface
model = AutoModelForTokenClassification.from_pretrained(model_id)
# load the tokenizer and model into a NER pipeline
nlp = pipeline(
    "ner", model=model, tokenizer=tokenizer, aggregation_strategy="max", device=device
)

api_key = os.getenv("PINECONE_API_KEY") or "YOUR-API-KEY"
pinecone.init(api_key=api_key, environment="us-west1-gcp")
initialize_app()

index_name = "anotherai"
index = pinecone.Index(index_name, pool_threads=8)
firestore_client = firestore.client()

def extract_named_entities(text_batch: List[str]) -> list:
    entities = []
    if not text_batch:
        return []
    # extract named entities using the NER pipeline
    try:
        # split retro in chunks of 3 sentences
        # this is probably inefficient
        # and we should batch notes together
        # but it works for now
        for note in text_batch:
            chunks = [
                m.group(0)
                for m in re.finditer(r"(?s)(.*?\n){2}", note)
                if len(m.group(0)) > 3
            ]
            if not chunks:
                chunks = [note]
            print("chunks", chunks)
            flat = list(itertools.chain.from_iterable(nlp(chunks)))
            # for each {'entity_group': 'LOC', 'score': 0.9996493, 'word': 'London', 'start': 0, 'end': 6},
            # entry, convert the score to a float because numpy is not pinecone serializable friendly
            flat = [
                {
                    "entity_group": e["entity_group"],
                    "score": float(e["score"]),
                    "word": e["word"],
                    "start": e["start"],
                    "end": e["end"],
                }
                for e in flat
            ]
            entities.append(flat)
    except Exception as e:
        print(e)
        return []
    return entities


def enrich_document_metadata(namespace: str, documents_id: List[str]):
    # split in chunks of n because fetch has a limit of size
    n = 200
    ids_to_fetch = [documents_id[i : i + n] for i in range(0, len(documents_id), n)]
    with ThreadPool(len(ids_to_fetch)) as pool:
        # i.e. [{"vectors": {"id": {"metadata": {"note_content": "foo"}}}}}]
        existing_documents = pool.map(
            lambda n: index.fetch(ids=n, namespace=namespace), ids_to_fetch
        )
    if not existing_documents:
        return []
    # flatten the list of documents into {"id": {"metadata": {"note_content": "foo"}}
    flat = {k: v for d in existing_documents for k, v in d["vectors"].items()}

    contents = [
        # TODO: somehow sometimes note_content is None? who care? "." hack (empty string is not allowed)
        flat[id].metadata.get("note_content", "...")
        for id in documents_id
    ]
    if not contents:
        return []

    # extract named entities from the texts
    entities = extract_named_entities(contents)

    return entities


# Triggered from a message on a Cloud Pub/Sub topic.
@functions_framework.cloud_event
def enrich_index(cloud_event):
    data = base64.b64decode(cloud_event.data["message"]["data"]).decode()
    print(data)

    json_data = json.loads(data)

    namespace, documents_id = json_data.get("namespace"), json_data.get("ids")
    if not namespace or not documents_id:
        print("Invalid data")
        return
    entities = enrich_document_metadata(namespace, documents_id)

    futures = []
    # update the entities to the index
    batch: WriteBatch = firestore_client.batch()
    for i, id in enumerate(documents_id):
        note_ner_entity_group = []
        note_ner_score = []
        note_ner_word = []
        note_ner_start = []
        note_ner_end = []
        locs = []
        pers = []
        orgs = []
        miscs = []
        for e in entities[i]:
            # skip if score is too low
            if e["score"] < 0.7:
                continue
            note_ner_entity_group.append(e["entity_group"])
            note_ner_score.append(e["score"])
            note_ner_word.append(e["word"])
            note_ner_start.append(e["start"])
            note_ner_end.append(e["end"])
            if e["entity_group"] == "LOC":
                locs.append(e["word"])
            elif e["entity_group"] == "PER":
                pers.append(e["word"])
            elif e["entity_group"] == "ORG":
                orgs.append(e["word"])
            elif e["entity_group"] == "MISC":
                miscs.append(e["word"])
        ner = {
            "note_ner_entity_group": note_ner_entity_group,
            # HACK: pinecone doesn't support list of numbers
            "note_ner_score": str(note_ner_score),
            "note_ner_word": note_ner_word,
            "note_ner_start": str(note_ner_start),
            "note_ner_end": str(note_ner_end),
        }
        print(f"Updating {id}")
        print(ner)
        futures.append(
            index.update(
                id=id,
                # TODO: probably large notes will fuck up query size?
                set_metadata=ner,
                namespace=namespace,
                async_req=True,
            )
        )
        # update the entities to the firestore
        # i.e. entities/namespace/id -> {"LOC": [ "London", "Paris" ], "PER": [ "John", "Jane" ], ...}
        doc_id = hashlib.sha256(namespace.encode()).hexdigest()
        batch.set(firestore_client.collection("entities").document(doc_id), {
            "LOC": ArrayUnion(locs) if locs else [],
            "PER": ArrayUnion(pers) if pers else [],
            "ORG": ArrayUnion(orgs) if orgs else [],
            "MISC": ArrayUnion(miscs) if miscs else [],
            "namespace": namespace,
        }, merge=True)
        # max 500 writes per batch
        if i % 400 == 1:
            batch.commit()
            batch = firestore_client.batch()
    batch.commit()

    [e.get() for e in futures]

    print("Done")
