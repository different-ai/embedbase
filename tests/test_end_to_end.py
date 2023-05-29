"""
Tests at the end-to-end abstraction level.
"""

from typing import List

import math
from random import randint

import numpy as np
import pandas as pd
import pytest
from httpx import AsyncClient

from embedbase import get_app
from embedbase.database.base import VectorDatabase
from embedbase.database.memory_db import MemoryDatabase
from embedbase.database.postgres_db import Postgres
from embedbase.database.supabase_db import Supabase
from embedbase.embedding.openai import OpenAI
from embedbase.settings import get_settings_from_file
from tests.test_utils import unit_testing_dataset

vector_databases: List[VectorDatabase] = []


# before running any test initialize the databases
@pytest.fixture(scope="session", autouse=True)
def init_databases():
    settings = get_settings_from_file()

    try:
        vector_databases.append(Postgres())
    except:  # pylint: disable=bare-except
        print("Postgres dependency not installed, skipping")
    vector_databases.append(MemoryDatabase())
    try:
        vector_databases.append(
            Supabase(
                url=settings.supabase_url,
                key=settings.supabase_key,
            )
        )
    except:  # pylint: disable=bare-except
        print("Supabase dependency not installed, skipping")


async def run_around_tests(skip_db=[]):
    for vector_database in vector_databases:
        if len(skip_db) > 0 and any(
            [isinstance(vector_database, db) for db in skip_db]
        ):
            continue
        await vector_database.clear(unit_testing_dataset)
        settings = get_settings_from_file()
        app = (
            get_app(settings)
            .use_db(vector_database)
            .use_embedder(OpenAI(settings.openai_api_key))
            .run()
        )
        yield app


@pytest.mark.asyncio
async def test_clear():
    async for app in run_around_tests():
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
                            "metadata": {"somethibng": f"test_{i}"},
                        }
                        for i, text in enumerate(df.text.tolist())
                    ],
                },
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("results")) == 10

        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}/search", json={"query": "bob", "top_k": 10}
            )
            assert response.status_code == 200
            json_response = response.json()
            assert json_response.get("query", "") == "bob"
            assert len(json_response.get("similarities")) == 10

        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(f"/v1/{unit_testing_dataset}/clear")
            assert response.status_code == 200
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
    async for app in run_around_tests():
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
    async for app in run_around_tests():
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
    async for app in run_around_tests():
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
    async for app in run_around_tests():
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


@pytest.mark.asyncio
async def test_adding_twice_the_same_data_is_ignored():
    async for app in run_around_tests():
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
    async for app in run_around_tests():
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
    async for app in run_around_tests():
        """
        should create a dataset by inserting some data
        and return a list of datasets
        """
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(
                "/v1/datasets",
            )
            assert response.status_code == 200
            json_response = response.json()
            # shouldn't have "unit_testing_dataset" in the list
            ds_id = [
                e
                for e in json_response.get("datasets")
                if e["dataset_id"] == unit_testing_dataset
            ]
            assert unit_testing_dataset not in ds_id or ds_id[0]["documents_count"] == 0

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
                "/v1/datasets",
            )
            assert response.status_code == 200
            json_response = response.json()
            # should have "unit_testing_dataset" in the list
            ds_id = [e["dataset_id"] for e in json_response.get("datasets")]
            assert unit_testing_dataset in ds_id
            ds = [
                e
                for e in json_response.get("datasets")
                if e["dataset_id"] == unit_testing_dataset
            ][0]
            assert ds["documents_count"] == 3


@pytest.mark.asyncio
async def test_get_datasets_with_auth():
    async for app in run_around_tests():
        """
        an authenticated client
        should create a dataset by inserting some data
        and return a list of datasets
        another authenticated client
        should create a dataset by inserting some data
        and get a list of dataset, only his own
        """
        settings = get_settings_from_file()

        async def add_uid(request, call_next, db, embedder):
            request.scope["uid"] = "test"
            response = await call_next(request)
            return response

        app = (
            get_app(settings)
            .use_middleware(add_uid)
            .use_db(MemoryDatabase())
            .use_embedder(OpenAI(settings.openai_api_key))
        ).run()

        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(
                f"/v1/datasets",
            )
            assert response.status_code == 200
            json_response = response.json()
            # TODO: iterate on this test by insert first docs with this user then
            # check datasets
            assert json_response.get("datasets") == []


@pytest.mark.asyncio
async def test_update_documents():
    async for app in run_around_tests():
        # First, insert some documents
        documents = [
            {
                "data": f"Document {i}",
                "metadata": {"index": i},
            }
            for i in range(3)
        ]

        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}",
                json={"documents": documents},
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("results")) == 3

            document_ids = [result["id"] for result in json_response.get("results")]

        # Now, update the inserted documents
        updated_documents = [
            {
                "id": document_id,
                "data": f"Updated document {i}",
                "metadata": {"index": i, "updated": True},
            }
            for i, document_id in enumerate(document_ids)
        ]

        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.put(
                f"/v1/{unit_testing_dataset}",
                json={"documents": updated_documents},
            )
            assert response.status_code == 200

        # Search for updated documents
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}/search",
                json={"query": "Updated document"},
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("similarities")) == 3

            # Check if the documents are updated
            for similarity in json_response.get("similarities"):
                assert similarity["data"].startswith("Updated document")
                assert similarity["metadata"]["updated"] is True


d = [
    {
        "data": "Alice invited Bob at 6 PM",
        "metadata": {"source": "notion.so", "path": "https://notion.so/alice"},
    },
    {
        "data": "Lee woke up at 4 AM",
        "metadata": {
            "source": "ouraring.com",
            "path": "https://ouraring.com/lee",
        },
    },
    {
        "data": "John pushed code at 8 AM",
        "metadata": {
            "source": "github.com",
            "path": "https://github.com/john/john",
        },
    },
    {
        "data": "John pushed code at 8 AM",
        "metadata": {
            "source": "google.com",
            "path": "https://google.com/john",
        },
    },
    {
        "data": "The lion is the king of the savannah",
        "metadata": {
            "source": "wikipedia.org",
            "path": "https://en.wikipedia.org/wiki/Lion",
        },
    },
]


@pytest.mark.asyncio
async def test_search_with_where():
    async for app in run_around_tests(skip_db=[Postgres]):
        # First, insert some documents
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}",
                json={"documents": d},
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("results")) == 5

        # Now, search the inserted documents
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}/search",
                json={
                    "query": "Time related",
                    "where": {
                        "source": "github.com",
                    },
                    "top_k": 3,
                },
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("similarities")) == 1
            assert (
                json_response.get("similarities")[0]["data"]
                == "John pushed code at 8 AM"
            )


@pytest.mark.asyncio
async def test_search_should_return_everything_necessary():
    async for app in run_around_tests():
        # First, insert some documents
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}",
                json={"documents": d},
            )
            assert response.status_code == 200

        # Now, search the inserted documents
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}/search",
                json={
                    "query": "Time related",
                    "top_k": 3,
                },
            )
            assert response.status_code == 200
            json_response = response.json()
            # should return created, id, dataset_id, query, similarities
            assert "similarities" in json_response
            assert "query" in json_response
            assert "dataset_id" in json_response
            assert "id" in json_response
            assert "created" in json_response


@pytest.mark.asyncio
async def test_list_endpoint():
    async for app in run_around_tests(skip_db=[Postgres, MemoryDatabase]):
        # First, insert some documents
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}",
                json={"documents": d},
            )
            assert response.status_code == 200

        # Now, list documents
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(
                f"/v1/{unit_testing_dataset}",
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("documents")) == 5

        # offset 0, limit 4
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(
                f"/v1/{unit_testing_dataset}?offset=0&limit=4",
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("documents")) == 4

        # offset 1, limit 2
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(
                f"/v1/{unit_testing_dataset}?offset=1&limit=2",
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("documents")) == 2

        # offset 2, limit 2
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(
                f"/v1/{unit_testing_dataset}?offset=2&limit=2",
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("documents")) == 2

        # offset 2, limit 10
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(
                f"/v1/{unit_testing_dataset}?offset=2&limit=10",
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("documents")) == 3


@pytest.mark.asyncio
async def test_add_without_data_shouldnt_crash():
    async for app in run_around_tests():
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}",
                json={"documents": []},
            )
            assert response.status_code == 200
            json_response = response.json()
            assert json_response.get("results") == []

        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}",
                json={
                    "documents": [
                        {
                            "data": "",
                        }
                    ]
                },
            )
            assert response.status_code == 422
            text_response = response.text
            assert (
                text_response
                == '{"detail":[{"loc":["body","documents",0,"data"],"msg":"data must not be empty","type":"assertion_error"}]}'
            )
