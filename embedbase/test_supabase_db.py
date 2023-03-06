"""
Tests at the Supabase VectorDatabase abstraction level.
"""

import hashlib
from httpx import AsyncClient
import pytest
from embedbase.pinecone_db import Pinecone
from embedbase.settings import get_settings

from embedbase.test_utils import clear_dataset

from .api import app
import pandas as pd


@pytest.mark.asyncio
async def test_pinecone_fetch_by_hash():
    await clear_dataset()
    d = [
        "The lion is the king of the jungle",
        "The lion is a large cat",
        "The lion is a carnivore",
    ]
    df = pd.DataFrame({"data": d}, columns=["data", "hash"])
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            "/v1/dev",
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
        assert len(json_response.get("inserted_ids")) == 3
        assert len(json_response.get("ignored_ids")) == 0
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    settings = get_settings()
    vector_database = Pinecone(
        api_key=settings.pinecone_api_key,
        environment=settings.pinecone_environment,
        index_name=settings.pinecone_index,
    )
    matches = await vector_database.fetch_by_hash(df.hash.tolist())
    assert len(matches) == 3
