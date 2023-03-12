import hashlib
import pandas as pd
import pytest
from embedbase.embeddings import embed
from embedbase.settings import EmbeddingProvider, get_settings
from embedbase.supabase_db import Supabase

use_cases = {
    EmbeddingProvider.OPENAI: {
        "dimensionality": 1536,
    },
    EmbeddingProvider.COHERE: {
        "dimensionality": 4096,
    },
}

d = [
    "Bob is a human",
    "The quick brown fox jumps over the lazy dog",
]


@pytest.mark.asyncio
async def test_can_embed():
    get_settings()

    for provider, use_case in use_cases.items():
        embeddings = embed(d, provider=provider)
        assert len(embeddings) == 2
        assert len(embeddings[0]) == use_case["dimensionality"]
        assert len(embeddings[1]) == use_case["dimensionality"]


@pytest.mark.asyncio
async def test_can_embed_and_insert_in_db():
    raise NotImplementedError("cohere is not implemented yet")
    s = get_settings()
    db = Supabase(
        url=s.supabase_url,
        key=s.supabase_key,
    )
    # TODO: run setup (create table...)
    for provider, use_case in use_cases.items():
        embeddings = embed(d, provider=provider)
        assert len(embeddings) == 2
        assert len(embeddings[0]) == use_case["dimensionality"]
        assert len(embeddings[1]) == use_case["dimensionality"]
        df = pd.DataFrame(
            [
                {
                    "data": d[i],
                    "embedding": embedding,
                    "id": str(i),
                    "hash": hashlib.sha256(d[i].encode()).hexdigest(),
                }
                for i, embedding in enumerate(embeddings)
            ],
            columns=["data", "embedding", "id", "hash"],
        )
        db.update(df, "test")
        results = db.search(embeddings[0], top_k=2, dataset_id="test")
        assert len(results) > 0
        assert results[0]["id"] == "0"
        assert results[0]["data"] == d[0]
        assert results[0]["embedding"]
