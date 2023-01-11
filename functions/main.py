from multiprocessing.pool import ThreadPool
import os
import re
import itertools
import base64
from typing import List
import json
from transformers import AutoTokenizer, AutoModelForTokenClassification
from transformers import pipeline

import functions_framework
import pinecone

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


index_name = "anotherai"
index = pinecone.Index(index_name, pool_threads=8)


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
    for i, id in enumerate(documents_id):
        ner = {
            "note_ner_entity_group": [e["entity_group"] for e in entities[i]],
            # HACK: pinecone doesn't support list of numbers
            "note_ner_score": str([e["score"] for e in entities[i]]),
            "note_ner_word": [e["word"] for e in entities[i]],
            "note_ner_start": str([e["start"] for e in entities[i]]),
            "note_ner_end": str([e["end"] for e in entities[i]]),
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

    [e.get() for e in futures]

    print("Done")
