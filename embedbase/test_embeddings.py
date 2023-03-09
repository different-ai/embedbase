import pytest
from embedbase.embeddings import batch_embed
import openai
from embedbase.settings import get_settings

settings = get_settings()
openai.api_key = settings.openai_api_key
openai.organization = settings.openai_organization


@pytest.mark.asyncio
async def test_batch_embed_large():
    # many large texts
    data = batch_embed(["".join("AGI " * 10_000) for _ in range(10)])
    assert len(data) == 10
    assert [len(d) for d in data] == [1536] * 10
