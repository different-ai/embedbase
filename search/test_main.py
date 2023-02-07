from fastapi.testclient import TestClient
from pandas import DataFrame
from .api import app, embed, upload_embeddings_to_vector_database, index, no_batch_embed
import pandas as pd
import math
from random import randint
import numpy as np


def test_clear():
    with TestClient(app=app) as client:
        response = client.get(
            "/v1/dev/clear",
        )
        assert response.status_code == 200
        assert response.json().get("status", "") == "success"

def test_semantic_search():
    with TestClient(app=app) as client:
        response = client.post("/v1/dev/search", json={"query": "bob"})
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
            "/v1/dev",
            json={
                "documents": [
                    {
                        "data": text,
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
                "data": "Bob is a human",
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(data)
        ],
        columns=[
            "data",
            "embedding",
            "id",
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
            ("".join(
                [
                    chr(math.floor(97 + 26 * np.random.rand()))
                    for _ in range(randint(500, 800))
                ]
            ), i)
            for i in range(10)
        ],
        columns=["text", "id"],
    )
    with TestClient(app=app) as client:
        response = client.get(
            "/v1/dev/clear",
        )
        response = client.post(
            "/v1/dev",
            json={
                "documents": [
                    {
                        "data": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
            },
        )
        assert response.status_code == 200
        assert response.json().get("status", "") == "success"
        ids = response.json().get("inserted_ids", [])
        # add to df
        df["id"] = ids
    with TestClient(app=app) as client:
        response = client.post(
            "/v1/dev",
            json={
                "documents": [
                    {
                        "id": id,
                        "data": text,
                    }
                    for id, text in zip(df.id.tolist(), df.text.tolist())
                ],
            },
        )
        assert response.status_code == 200
        assert len(response.json().get("ignored_ids")) == 10