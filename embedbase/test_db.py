"""
Tests at the database abstraction level.
"""

import hashlib
from typing import List

import pandas as pd
import pytest

from embedbase.db import VectorDatabase
from embedbase.db_utils import batch_select
from embedbase.settings import get_settings
from embedbase.supabase_db import Supabase
from embedbase.test_utils import clear_dataset, unit_testing_dataset

from .embeddings import embed

settings = get_settings()
vector_databases: List[VectorDatabase] = [
    Supabase(
        url=settings.supabase_url,
        key=settings.supabase_key,
    ),
]


@pytest.mark.asyncio
async def test_search():
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = embed(d)
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": embedding,
                "id": str(i),
            }
            for i, embedding in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.search(
            embeddings[0],
            top_k=2,
            dataset_id=unit_testing_dataset,
        )
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0]["id"] == "0", f"failed for {vector_database}"
        assert results[0]["data"] == d[0], f"failed for {vector_database}"
        assert results[0]["embedding"], f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_fetch():
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = embed(d)
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": embedding,
                "id": str(i),
            }
            for i, embedding in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.select(ids=["0"], dataset_id=unit_testing_dataset)
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0]["id"] == "0", f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_fetch_by_hash():
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = embed(d)
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": embedding,
                "id": str(i),
            }
            for i, embedding in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.select(
            hashes=[df.hash[0]], dataset_id=unit_testing_dataset
        )
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0]["id"] == "0", f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_clear():
    data = [
        [0.0] * 1536,
        [0.0] * 1536,
    ]
    df = pd.DataFrame(
        [
            {
                "data": "Bob is a human",
                "embedding": embedding,
                "id": str(i),
            }
            for i, embedding in enumerate(data)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.search(
            data[0],
            top_k=2,
            dataset_id=unit_testing_dataset,
        )
        # dont care about ordering (postgres & pinecone run different algorithms)
        ids = sorted([result["id"] for result in results])
        assert ids[0] == "0", f"failed for {vector_database}"
        assert ids[1] == "1", f"failed for {vector_database}"
        await vector_database.clear(unit_testing_dataset)

    for vector_database in vector_databases:
        results = await vector_database.search(
            data[0],
            top_k=2,
            dataset_id=unit_testing_dataset,
        )
        assert len(results) == 0, f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_upload():
    data = [
        [0.0] * 1536,
        [0.0] * 1536,
    ]
    df = pd.DataFrame(
        [
            {
                "data": "Bob is a human",
                "embedding": embedding,
                "id": str(i),
            }
            for i, embedding in enumerate(data)
        ],
        columns=[
            "data",
            "embedding",
            "id",
            "hash",
        ],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)

        results = await vector_database.search(
            data[0],
            top_k=2,
            dataset_id=unit_testing_dataset,
        )
        # dont care about ordering (postgres & pinecone run different algorithms)
        ids = sorted([result["id"] for result in results])
        assert ids[0] == "0", f"failed for {vector_database}"
        assert ids[1] == "1", f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_batch_select_large_content():
    """
    should not throw an error
    """
    d = []
    for _ in range(1000):
        d.append("a" * 1_000_000)
    hashes = [hashlib.sha256(x.encode()).hexdigest() for x in d]
    for vector_database in vector_databases:
        await batch_select(
            vector_database,
            hashes,
            None,
            None,
        )
