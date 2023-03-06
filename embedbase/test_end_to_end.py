"""
Tests at the end-to-end abstraction level.
"""

from httpx import AsyncClient
import pytest

from embedbase.test_utils import clear_dataset, namespace
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

    await clear_dataset()
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
        ["foo" for _ in range(10)],
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
async def test_ignore_document_that_didnt_change():
    df = pd.DataFrame(
        [
            (
                "".join(
                    [
                        chr(math.floor(97 + 26 * np.random.rand()))
                        for _ in range(randint(500, 800))
                    ]
                ),
                i,
            )
            for i in range(10)
        ],
        columns=["text", "id"],
    )
    await clear_dataset()
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
    await clear_dataset()
    df = pd.DataFrame(
        ["bob is a human"],
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


@pytest.mark.asyncio
async def test_health_properly_forward_headers():
    import requests_mock

    # mock http://0.0.0.0:8000/v1/test
    with requests_mock.Mocker(
        real_http=True,
        case_sensitive=True,
    ) as m:
        m.post("http://0.0.0.0:8080/v1/test")
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(
                "/health",
                headers={"Authorization": "Bearer 123"},
            )
            # TODO: any way to listen to the request and check the headers?
            # without using pcap or hacks like that lol?
            assert response.status_code == 200
            assert response.json().get("status", "") == "success"




@pytest.mark.asyncio
async def test_adding_twice_the_same_data_is_ignored(): # TODO: implement in api.py
    await clear_dataset()
    d = [
        "The lion is the king of the jungle",
        "The lion is a large cat",
        "The lion is a carnivore",
    ]
    df = pd.DataFrame({"data": d})

    async def _i(ins=3, ign=0):
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{namespace}",
                json={
                    "documents": [
                        {
                            "data": data,
                        }
                        for i, data in enumerate(df.data.tolist())
                    ],
                },
            )
            assert response.status_code == 200
            json_response = response.json()
            assert json_response.get("status", "") == "success"
            assert len(json_response.get("inserted_ids")) == ins
            assert len(json_response.get("ignored_ids")) == ign

    # insert twice the same ting
    await _i()
    # should have been ignored
    await _i(0, 3)

    # search should not have duplicates
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{namespace}/search", json={"query": "Feline animal"}
        )
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "Feline animal"
        assert len(json_response.get("similarities")) > 0
        # check that there are no duplicates
        for idx, lion in enumerate(
            sorted([e["data"] for e in json_response.get("similarities")])
        ):
            assert lion == sorted(d)[idx], f"{lion} != {sorted(d)[idx]}"
