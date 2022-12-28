from fastapi.testclient import TestClient
from .api import app
import pandas as pd
import math
from random import randint
import numpy as np

def test_semantic_search():
    with TestClient(app=app) as client:
        response = client.post("/semantic_search", json={"query": "bob"})
        assert response.status_code == 200


# curl -X POST -H "Content-Type: application/json" -d '{"notes": [{"note_path": "Bob.md", "note_tags": ["Humans", "Bob"], "note_content": "Bob is a human"}]}' http://localhost:3333/refresh | jq '.'
def test_refresh_small_notes():
    df = pd.DataFrame(["".join([chr(math.floor(97 + 26 * np.random.rand())) for _ in range(randint(500, 800))]) for _ in range(10)], columns=['text'])
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
                ]
            },
        )
        assert response.status_code == 200
