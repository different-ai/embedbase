import os
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
    if not text_batch:
        return []
    # extract named entities using the NER pipeline
    try:
        extracted_batch = nlp(text_batch)
    except Exception as e:
        print(e)
        return []
    entities = []
    if not extracted_batch:
        return entities
    # loop through the results and only select the entity names
    for text in extracted_batch:
        # if list
        ne = (
            [entity["word"] for entity in text]
            if isinstance(text, list)
            else text["word"]
        )
        entities.append(list(set(ne)))
    return entities


def enrich_document_metadata(namespace: str, documents_id: List[str]) -> dict:
    # {"id": foo} # id of document to be extracted
    response = index.fetch(documents_id, namespace=namespace)
    if not response:
        return

    contents = [
        # TODO: somehow sometimes note_content is None? who care? "." hack (empty string is not allowed)
        response.vectors[id].metadata.get("note_content", ".") for id in documents_id
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
        futures.append(
            index.update(
                id=id,
                set_metadata={"ner": entities[i]},
                namespace=namespace,
                async_req=True,
            )
        )

    [e.get() for e in futures]

    print("Done")
