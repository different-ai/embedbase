from httpx import AsyncClient
import pytest
from fastapi.testclient import TestClient
from api import app


def test_semantic_search():
    with TestClient(app=app) as client:
        response = client.post("/semantic_search", json={"query": "bob"})
        assert response.status_code == 200


# curl -X POST -H "Content-Type: application/json" -d '{"notes": [{"note_path": "Bob.md", "note_tags": ["Humans", "Bob"], "note_content": "Bob is a human"}]}' http://localhost:3333/refresh | jq '.'
def test_refresh():
    with TestClient(app=app) as client:
        response = client.post(
            "/refresh",
            json={
                "notes": [
                    {
                        "note_path": "Bob.md",
                        "note_tags": ["Humans", "Bob"],
                        "note_content": "Bob is a human",
                    }
                ]
            },
        )
        assert response.status_code == 200
