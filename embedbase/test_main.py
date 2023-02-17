from fastapi.testclient import TestClient
from httpx import AsyncClient
from pandas import DataFrame
import pytest
from embedbase.pinecone_db import Pinecone

from embedbase.settings import get_settings
from .api import app, embed, no_batch_embed, settings
import pandas as pd
import math
from random import randint
import numpy as np

@pytest.mark.asyncio
async def test_clear():
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
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
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
        json_response = response.json()
        assert json_response.get("status", "") == "success"
        assert len(json_response.get("inserted_ids")) == 10

    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            "/v1/dev/clear",    
        )
        assert response.status_code == 200
        assert response.json().get("status", "") == "success"

    # search now
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post("/v1/dev/search", json={"query": "bob"})
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "bob"
        assert len(json_response.get("similarities")) == 0

@pytest.mark.asyncio
async def test_semantic_search():
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post("/v1/dev/search", json={"query": "bob"})
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "bob"

@pytest.mark.asyncio
async def test_refresh_small_documents():
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
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
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
        json_response = response.json()
        assert json_response.get("status", "") == "success"
        assert len(json_response.get("inserted_ids")) == 10


@pytest.mark.asyncio
async def test_sync_no_id_collision():
    df = pd.DataFrame(
        [
            "foo"
            for _ in range(10)
        ],
        columns=["text"],
    )
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
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
        json_response = response.json()
        assert json_response.get("status", "") == "success"
        # make sure all ids are unique
        assert len(set(json_response.get("inserted_ids"))) == 10



def test_embed():
    data = embed(["hello world", "hello world"])
    assert [len(d["embedding"]) for d in data] == [1536, 1536]

def test_embed_large_text():
    # large text > 10.000 characters
    data = no_batch_embed("".join("a" * 10_000))
    assert len(data) == 1536

@pytest.mark.asyncio
async def test_upload():
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
    settings = get_settings()
    vector_database = Pinecone(
        api_key=settings.pinecone_api_key,
        environment=settings.pinecone_environment,
        index_name=settings.pinecone_index,
    )
    await vector_database.update(df, "unit_test_test_upload")

    results = await vector_database.search(
        data[0]["embedding"],
        top_k=2,
        namespace="unit_test_test_upload",
    )
    assert results[0]["id"] == "1"
    assert results[1]["id"] == "0"

@pytest.mark.asyncio
async def test_ignore_document_that_didnt_change():
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
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            "/v1/dev/clear",
        )
        response = await client.post(
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
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
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


@pytest.mark.asyncio
async def test_save_clear_data():
    # clear all
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            "/v1/dev/clear",
        )
        assert response.status_code == 200
        assert response.json().get("status", "") == "success"
    df = pd.DataFrame(
        [
            "bob is a human"
        ],
        columns=["text"],
    )
    settings.save_clear_data = False
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
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
        json_response = response.json()
        assert json_response.get("status", "") == "success"
        assert len(json_response.get("inserted_ids")) == 1
    # now search shouldn't have the "data" field in the response
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            "/v1/dev/search",
            json={"query": "bob"},
        )
        assert response.status_code == 200
        json_response = response.json()
        assert len(json_response.get("similarities")) > 0
        assert json_response.get("similarities")[0].get("data") is None
