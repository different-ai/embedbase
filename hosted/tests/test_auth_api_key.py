# pylint: disable=missing-function-docstring

from typing import List, Union

import os

import numpy as np
import pytest
from fastapi import Request

from embedbase.embedding.base import Embedder
from hosted.middlewares.auth_api_key.auth_api_key import get_event_from_request


# pylint: disable=missing-docstring
class FakeEmbedder(Embedder):
    def __init__(self, dimensions: int = 384, **kwargs):
        super().__init__(**kwargs)
        self._dimensions = dimensions

    @property
    def dimensions(self) -> int:
        """
        Return the dimensions of the embeddings
        :return: dimensions of the embeddings
        """
        return self._dimensions

    def is_too_big(self, text: str) -> bool:
        """
        Check if text is too big to be embedded,
        delegating the splitting UX to the caller
        :param text: text to check
        :return: True if text is too big, False otherwise
        """
        return len(text) > 1000

    async def embed(self, data: Union[List[str], str]) -> List[List[float]]:
        """
        Embed a list of texts
        :param texts: list of texts
        :return: list of embeddings
        """
        # random numpy array
        return np.random.rand(len(data), self._dimensions).tolist()


# embedbase = (
#     get_app()
#     .use_db(MemoryDatabase())
#     .use_middleware(AuthApiKey)
#     .use_embedder(FakeEmbedder())
# )


# app = embedbase.run()

# Use a local instance of the API with the fake embedder
base_url = "http://localhost:8000"

# Dataset to be used in tests
unit_testing_dataset = os.environ.get("EMBEDBASE_DATASET", "unit_test_hosted")


@pytest.mark.asyncio
async def test_properly_track_in_posthog_path():
    # POST /v1/{vault_id}/search
    # POST /v1/{vault_id}
    # POST /v1/internet/search
    # POST /v1/{dataset_id}/replace

    # Test case for POST /v1/{vault_id}/search
    request = Request(
        scope={"type": "http", "path": f"/v1/{unit_testing_dataset}/search"}
    )
    event = get_event_from_request(request)
    assert event == "search"

    # Test case for POST /v1/{vault_id}
    request = Request(scope={"type": "http", "path": f"/v1/{unit_testing_dataset}"})
    event = get_event_from_request(request)
    assert event == "add"

    # Test case for POST /v1/internet/search
    request = Request(scope={"type": "http", "path": "/v1/search/internet"})
    event = get_event_from_request(request)
    assert event == "internet-search"

    # Test case for POST /v1/{dataset_id}/replace
    request = Request(
        scope={"type": "http", "path": f"/v1/{unit_testing_dataset}/replace"}
    )
    event = get_event_from_request(request)
    assert event == "replace"

    # Certainly! Here are a few tricky test cases that will cover different edge cases:

    # 1. Test case when dataset is named "search".

    request = Request(scope={"type": "http", "path": "/v1/search"})
    event = get_event_from_request(request)
    assert event == "add"

    # 2. Test case when dataset is named "internet".

    request = Request(scope={"type": "http", "path": "/v1/internet"})
    event = get_event_from_request(request)
    assert event == "add"

    # 3. Test case when a path component starts with "search" or "internet".

    request = Request(scope={"type": "http", "path": "/v1/search123"})
    event = get_event_from_request(request)
    assert event == "add"

    request = Request(scope={"type": "http", "path": "/v1/internet456"})
    event = get_event_from_request(request)
    assert event == "add"

    # 4. Test case when dataset is followed by extra slashes.

    request = Request(scope={"type": "http", "path": "/v1/test_dataset//"})
    event = get_event_from_request(request)
    assert event == "add"

    request = Request(scope={"type": "http", "path": "/v1/test_dataset///replace"})
    event = get_event_from_request(request)
    assert event == "replace"

    # 5. Test case when a non-matching path is given.

    request = Request(scope={"type": "http", "path": "/v1/random/path"})
    event = get_event_from_request(request)
    assert event is None
