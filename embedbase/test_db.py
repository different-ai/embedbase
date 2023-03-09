"""
Tests at the database abstraction level.
"""

import hashlib
from typing import List
import pytest
from embedbase.db import VectorDatabase
from embedbase.pinecone_db import Pinecone
from embedbase.settings import get_settings
from embedbase.supabase_db import Supabase
from embedbase.test_utils import namespace


from .embeddings import embed
import pandas as pd

settings = get_settings()
vector_databases: List[VectorDatabase] = [
    Pinecone(
        api_key=settings.pinecone_api_key,
        environment=settings.pinecone_environment,
        index_name=settings.pinecone_index,
    ),
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
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(namespace)
        await vector_database.update(df, namespace)
        results = await vector_database.search(
            embeddings[0]["embedding"],
            top_k=2,
            namespace=namespace,
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
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(namespace)
        await vector_database.update(df, namespace)
        results = await vector_database.fetch(["0"], namespace)
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0]["id"] == "0", f"failed for {vector_database}"

@pytest.mark.asyncio
async def test_fetch_by_hash():
    del vector_databases[0] # HACK to remove pinecone from this test not supported
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = embed(d)
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(namespace)
        await vector_database.update(df, namespace)
        results = await vector_database.fetch_by_hash([df.hash[0]], namespace)
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0]["id"] == "0", f"failed for {vector_database}"

@pytest.mark.asyncio
async def test_clear():
    data = [
        {"embedding": [0.0] * 1536},
        {"embedding": [0.0] * 1536},
    ]
    df = pd.DataFrame(
        [
            {
                "data": "Bob is a human",
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(data)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(namespace)
        await vector_database.update(df, namespace)
        results = await vector_database.search(
            data[0]["embedding"],
            top_k=2,
            namespace=namespace,
        )
        # dont care about ordering (postgres & pinecone run different algorithms)
        ids = sorted([result["id"] for result in results]) 
        assert ids[0] == "0", f"failed for {vector_database}"
        assert ids[1] == "1", f"failed for {vector_database}"
        await vector_database.clear(namespace)

    for vector_database in vector_databases:
        results = await vector_database.search(
            data[0]["embedding"],
            top_k=2,
            namespace=namespace,
        )
        assert len(results) == 0, f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_upload():
    data = [
        {"embedding": [0.0] * 1536},
        {"embedding": [0.0] * 1536},
    ]
    df = pd.DataFrame(
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
            "hash",
        ],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(namespace)
        await vector_database.update(df, namespace)

        results = await vector_database.search(
            data[0]["embedding"],
            top_k=2,
            namespace=namespace,
        )
        # dont care about ordering (postgres & pinecone run different algorithms)
        ids = sorted([result["id"] for result in results]) 
        assert ids[0] == "0", f"failed for {vector_database}"
        assert ids[1] == "1", f"failed for {vector_database}"
