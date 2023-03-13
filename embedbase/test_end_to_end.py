"""
Tests at the end-to-end abstraction level.
"""

import math
from random import randint

import numpy as np
import pandas as pd
import pytest
import pytest_mock

from httpx import AsyncClient

from embedbase.embeddings import embed
from embedbase.settings import Settings, get_settings
from embedbase.test_utils import clear_dataset, unit_testing_dataset

from .api import get_app


@pytest.mark.asyncio
async def test_clear():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
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
            f"/v1/{unit_testing_dataset}",
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
        assert len(json_response.get("results")) == 10

    await clear_dataset()
    # search now
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}/search", json={"query": "bob"}
        )
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "bob"
        assert len(json_response.get("similarities")) == 0


@pytest.mark.asyncio
async def test_refresh_small_documents():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
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
            f"/v1/{unit_testing_dataset}",
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
        assert len(json_response.get("results")) == 10


@pytest.mark.asyncio
async def test_sync_no_id_collision():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    df = pd.DataFrame(
        ["foo" for _ in range(10)],
        columns=["text"],
    )
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}",
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
        # make sure all ids are unique
        ids = list(set([e["id"] for e in json_response.get("results")]))
        assert len(ids) == 10


@pytest.mark.asyncio
async def test_save_clear_data():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    df = pd.DataFrame(
        ["bob is a human"],
        columns=["text"],
    )
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            "/v1/unit_test",
            json={
                "documents": [
                    {
                        "data": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
                "store_data": False,
            },
        )
        assert response.status_code == 200
        json_response = response.json()
        assert len(json_response.get("results")) == 1
    # now search shouldn't have the "data" field in the response
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            "/v1/unit_test/search",
            json={"query": "bob"},
        )
        assert response.status_code == 200
        json_response = response.json()
        assert len(json_response.get("similarities")) > 0
        assert json_response.get("similarities")[0].get("data") is None


@pytest.mark.asyncio
async def test_health_properly_forward_headers():
    import requests_mock

    settings = get_settings()
    app = get_app(settings)
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


@pytest.mark.asyncio
async def test_adding_twice_the_same_data_is_ignored():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    d = [
        "The lion is the king of the jungle",
        "The lion is a large cat",
        "The lion is a carnivore",
    ]
    df = pd.DataFrame({"data": d})

    async def _i(results_length):
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}",
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
            assert len(json_response.get("results")) == results_length

    # insert twice the same ting
    await _i(3)
    # should have been ignored but still return 3 to client
    await _i(3)

    # search should not have duplicates
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}/search", json={"query": "Feline animal"}
        )
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "Feline animal"
        assert len(json_response.get("similarities")) == 3
        # check that there are no duplicates
        for idx, lion in enumerate(
            sorted([e["data"] for e in json_response.get("similarities")])
        ):
            assert lion == sorted(d)[idx], f"{lion} != {sorted(d)[idx]}"


@pytest.mark.asyncio
async def test_insert_large_documents_should_fail():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    # large texts > 10.000 characters
    d = ["".join("agi " * 10_000) for _ in range(10)]
    df = pd.DataFrame({"data": d})

    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}",
            json={
                "documents": [
                    {
                        "data": data,
                    }
                    for i, data in enumerate(df.data.tolist())
                ],
            },
        )
        assert response.status_code == 400

    # now search
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}/search", json={"query": "a", "top_k": 100}
        )
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "a"
        assert len(json_response.get("similarities")) == 0


@pytest.mark.asyncio
async def test_get_datasets_without_auth():
    """
    should create a dataset by inserting some data
    and return a list of datasets
    """
    await clear_dataset()
    settings = get_settings()
    app = get_app(settings)
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            f"/v1/datasets",
        )
        assert response.status_code == 200
        json_response = response.json()
        # shouldn't have "unit_testing_dataset" in the list
        assert unit_testing_dataset not in json_response.get("datasets")

    d = [
        "The lion is the king of the jungle",
        "The lion is a large cat",
        "The lion is a carnivore",
    ]
    df = pd.DataFrame({"data": d})
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}",
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
        assert len(json_response.get("results")) == 3

    # get datasets
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            f"/v1/datasets",
        )
        assert response.status_code == 200
        json_response = response.json()
        # should have "unit_testing_dataset" in the list
        assert unit_testing_dataset in json_response.get("datasets")


@pytest.mark.asyncio
async def test_get_datasets_with_auth(mocker):
    """
    an authenticated client
    should create a dataset by inserting some data
    and return a list of datasets
    another authenticated client
    should create a dataset by inserting some data
    and get a list of dataset, only his own
    """
    # TODO: does not FUCKING work?
    mocker.patch("embedbase.utils.get_user_id", return_value="user1")
    settings = get_settings()
    app = get_app(settings)

    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            f"/v1/datasets",
        )
        print(response.json())
