from fastapi.testclient import TestClient
from pandas import DataFrame
from .api import app, embed, upload_embeddings_to_vector_database, index, no_batch_embed
import pandas as pd
import math
from random import randint
import numpy as np
import json

def test_semantic_search():
    with TestClient(app=app) as client:
        response = client.post("/semantic_search", json={"query": "bob"})
        assert response.status_code == 200


def test_refresh_small_documents():
    df = pd.DataFrame(
        [
            "".join(
                [
                    chr(math.floor(97 + 26 * np.random.rand()))
                    for _ in range(randint(500, 800))
                ]
            )
            for _ in range(10)
        ],
        columns=["text"],
    )
    with TestClient(app=app) as client:
        response = client.post(
            "/refresh",
            json={
                "namespace": "dev",
                "documents": [
                    {
                        "document_path": f"{i}/Bob.md",
                        "document_tags": ["Humans", "Bob"],
                        "document_content": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
            },
        )
        assert response.status_code == 200
        assert response.json().get("status", "") == "success"


def test_embed():
    data = embed(["hello world", "hello world"])
    assert [len(d["embedding"]) for d in data] == [1536, 1536]

def test_embed_large_text():
    # large text > 10.000 characters
    data = no_batch_embed("".join("a" * 10_000))
    assert len(data) == 1536

def test_upload():
    data = embed(["hello world", "hello world"])
    df = DataFrame(
        [
            {
                "document_path": str(i),
                "document_tags": ["Humans", "Bob"],
                "document_content": "Bob is a human",
                "document_embedding": document["embedding"],
                "document_hash": str(i),
            }
            for i, document in enumerate(data)
        ],
        columns=[
            "document_path",
            "document_tags",
            "document_content",
            "document_embedding",
            "document_hash",
        ],
    )
    upload_embeddings_to_vector_database(df, "unit_test_test_upload")
    results = index.query(
        data[0]["embedding"],
        top_k=2,
        include_values=True,
        namespace="unit_test_test_upload",
    )
    assert results.matches[0]["id"] == "1"
    assert results.matches[1]["id"] == "0"


def test_ignore_document_that_didnt_change():
    df = pd.DataFrame(
        [
            "".join(
                [
                    chr(math.floor(97 + 26 * np.random.rand()))
                    for _ in range(randint(500, 800))
                ]
            )
            for _ in range(10)
        ],
        columns=["text"],
    )
    with TestClient(app=app) as client:
        response = client.post(
            "/refresh",
            json={
                "namespace": "dev",
                "clear": True,
            },
        )
        response = client.post(
            "/refresh",
            json={
                "namespace": "dev",
                "documents": [
                    {
                        "document_path": f"{i}/Bob.md",
                        "document_tags": ["Humans", "Bob"],
                        "document_content": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
            },
        )
        assert response.status_code == 200
        assert response.json().get("status", "") == "success"
    with TestClient(app=app) as client:
        response = client.post(
            "/refresh",
            json={
                "namespace": "dev",
                "documents": [
                    {
                        "document_path": f"{i}/Bob.md",
                        "document_tags": ["Humans", "Bob"],
                        "document_content": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
            },
        )
        assert response.status_code == 200
        assert len(response.json().get("ignored_hashes")) == 10