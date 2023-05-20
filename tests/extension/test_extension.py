import pytest
from httpx import AsyncClient

from embedbase.api import get_app
from embedbase.database.base import VectorDatabase
from embedbase.database.memory_db import MemoryDatabase
from embedbase.embedding.base import Embedder
from fastapi import Request
from typing import Callable

# pylint: disable=missing-docstring
class FakeEmbedder(Embedder):
    def __init__(self, dimensions: int = 384, **kwargs):
        super().__init__(**kwargs)
        self._dimensions = dimensions

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def is_too_big(self, text: str) -> bool:
        return len(text) > 1000

    async def embed(self, data):
        # pylint: disable=import-outside-toplevel
        import numpy as np

        return np.random.rand(len(data), self._dimensions).tolist()


@pytest.mark.asyncio
async def test_middleware_should_receive_vector_db_and_embedder_as_arg():
    async def save_search(request, call_next, db, embedder):
        # make sure request is a Request
        assert isinstance(request, Request)

        # make sure call_next is a Callable
        assert isinstance(call_next, Callable)

        # make sure db is a VectorDatabase
        assert isinstance(db, VectorDatabase)

        # make sure embedder is Embedder
        assert isinstance(embedder, Embedder)

        return await call_next(request)

    app = (
        get_app()
        .use_db(MemoryDatabase())
        .use_embedder(FakeEmbedder())
        .use_middleware(save_search)
    ).run()

    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        await client.post(
            "/v1/unit_test/search",
            json={
                "query": "Time related",
                "where": {
                    "source": "github.com",
                },
                "top_k": 3,
            },
        )
