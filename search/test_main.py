from fastapi.testclient import TestClient
from pandas import DataFrame
from .api import app, embed, upload_embeddings_to_vector_database, index
import pandas as pd
import math
from random import randint
import numpy as np
import json

def test_semantic_search():
    with TestClient(app=app) as client:
        response = client.post("/semantic_search", json={"query": "bob"})
        assert response.status_code == 200


# curl -X POST -H "Content-Type: application/json" -d '{"notes": [{"note_path": "Bob.md", "note_tags": ["Humans", "Bob"], "note_content": "Bob is a human"}]}' http://localhost:3333/refresh | jq '.'
def test_refresh_small_notes():
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
                "notes": [
                    {
                        "note_path": f"{i}/Bob.md",
                        "note_tags": ["Humans", "Bob"],
                        "note_content": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
            },
        )
        assert response.status_code == 200
        assert response.json() == {"status": "success"}


def test_embed():
    data = embed(["hello world", "hello world"])
    assert [len(d["embedding"]) for d in data] == [1536, 1536]


def test_upload():
    data = embed(["hello world", "hello world"])
    df = DataFrame(
        [
            {
                "note_path": str(i),
                "note_tags": ["Humans", "Bob"],
                "note_content": "Bob is a human",
                "note_embedding": note["embedding"],
                "note_hash": str(i),
            }
            for i, note in enumerate(data)
        ],
        columns=[
            "note_path",
            "note_tags",
            "note_content",
            "note_embedding",
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


def test_upload_big():
    # read test_data/upload.json
    # upload to vector database
    data = json.load(open("./search/test_data/upload.json"))
    with TestClient(app=app) as client:
        response = client.post(
            "/refresh",
            json={
                "namespace": "dev",
                "notes": data["notes"]
            },
        )
        assert response.status_code == 200
        assert response.json() == {"status": "success"}