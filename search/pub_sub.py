"""Publishes multiple messages to a Pub/Sub topic with an error handler."""
from typing import List
from google.cloud import pubsub_v1
import json

project_id = "obsidian-ai"
topic_id = "enrich_index"

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(project_id, topic_id)


def enrich_doc(docs_id: List[str], namespace: str):
    publisher.publish(
        topic_path, json.dumps({"ids": docs_id, "namespace": namespace}).encode("utf-8")
    )
