import pytest
from embedbase.settings import get_settings_from_file
from embedbase.embedding.openai import OpenAI
from embedbase.embedding.cohere import Cohere
from embedbase.embedding.base import Embedder



d = [
    "Bob is a human",
    "The quick brown fox jumps over the lazy dog",
]


@pytest.mark.asyncio
async def test_can_embed():
    settings = get_settings_from_file()
    embedders: Embedder = [
        OpenAI(settings.openai_api_key, settings.openai_organization),
        # Cohere(settings.cohere_api_key)
    ]
    for embedder in embedders:
        embeddings = await embedder.embed(d)
        assert len(embeddings) == 2
        assert len(embeddings[0]) == embedder.dimensions
        assert len(embeddings[1]) == embedder.dimensions

