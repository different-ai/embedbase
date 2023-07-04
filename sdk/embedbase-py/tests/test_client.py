# pylint: disable=missing-function-docstring

from typing import List, Union

import asyncio
import os

import numpy as np
import pytest
from embedbase_client import EmbedbaseAsyncClient
from embedbase_client.model import SearchSimilarity
from tiktoken import get_encoding

from embedbase import get_app
from embedbase.database.memory_db import MemoryDatabase
from embedbase.embedding.base import Embedder


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


def run_app():
    return get_app().use_db(MemoryDatabase()).use_embedder(FakeEmbedder()).run()


app = run_app()

# Use a local instance of the API with the fake embedder
base_url = "http://localhost:8000"
client = EmbedbaseAsyncClient(embedbase_url=base_url, fastapi_app=app, timeout=60)

# Dataset to be used in tests
test_dataset = os.environ.get("EMBEDBASE_DATASET", "unit_test")

ds = client.dataset(test_dataset)


@pytest.fixture(autouse=True)
@pytest.mark.asyncio
async def setup_and_teardown():
    yield

    # Teardown - clear the test dataset
    await ds.clear()


@pytest.mark.asyncio
async def test_add_single_document():
    document = "This is a test document."
    metadata = {"key": "value"}

    result = await ds.add(document, metadata)

    assert isinstance(result.id, str)


@pytest.mark.asyncio
async def test_batch_add_documents():
    documents = [
        {"data": "Document 1", "metadata": {"key": "value1"}},
        {"data": "Document 2", "metadata": {"key": "value2"}},
    ]

    results = await ds.batch_add(documents)

    assert len(results) == len(documents)
    for result in results:
        assert isinstance(result.id, str)


@pytest.mark.asyncio
async def test_list_datasets():
    documents = [
        {"data": "Document 1", "metadata": {"key": "value1"}},
        {"data": "Document 2", "metadata": {"key": "value2"}},
    ]

    await ds.clear()
    results = await ds.batch_add(documents)

    assert len(results) == len(documents)
    for result in results:
        assert isinstance(result.id, str)

    datasets = await client.datasets()
    assert datasets is not None
    assert isinstance(datasets, list)
    assert len(datasets) >= 1


@pytest.mark.skip(reason="somehow fail to connect")
# @pytest.mark.asyncio
async def test_search_documents():
    # Add some documents to the dataset
    documents = [
        {"data": "Document 1", "metadata": {"key": "value1"}},
        {"data": "Document 2", "metadata": {"key": "value2"}},
    ]
    await ds.batch_add(documents)

    # Perform a search
    query = "Document"
    results = await ds.search(query).get()

    # Check that the results are SearchResult instances
    assert len(results) > 0
    for result in results:
        assert isinstance(result, SearchSimilarity)

    # Check that the results contain the expected documents
    document_datas = [result.data for result in results]
    for doc in documents:
        assert doc["data"] in document_datas


@pytest.mark.skip(reason="somehow fail to connect")
# @pytest.mark.asyncio
async def test_filter_by_metadata_using_where():
    d = [
        {
            "data": "Alice invited Bob at 6 PM at the restaurant",
            "metadata": {"source": "notion.so", "path": "https://notion.so/alice"},
        },
        {
            "data": "John pushed code on github at 8 AM",
            "metadata": {
                "source": "github.com",
                "path": "https://github.com/john/john",
            },
        },
        {
            "data": "The lion is the king of the savannah.",
            "metadata": {
                "source": "wikipedia.org",
                "path": "https://en.wikipedia.org/wiki/Lion",
            },
        },
    ]

    await asyncio.gather(*[ds.add(input["data"], input["metadata"]) for input in d])

    data = await ds.search("Time related").where("source", "==", "github.com").get()

    assert data is not None
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "source" in data[0].metadata and data[0].metadata["source"] == "github.com"


@pytest.mark.asyncio
async def test_create_max_context_async():
    query = "What is Python?"
    max_tokens = 50
    await ds.clear()
    documents = [
        "Python is a programming language.",
        "Java is another popular programming language.",
        "JavaScript is widely used for web development.",
        "C++ is commonly used for system programming.",
        "Ruby is known for its simplicity and readability.",
        "Go is a statically typed language developed by Google.",
        "Rust is a systems programming language that focuses on safety and performance.",
        "TypeScript is a superset of JavaScript that adds static typing.",
        "PHP is a server-side scripting language used for web development.",
        "Swift is a modern programming language developed by Apple for iOS app development.",
    ]

    for document in documents:
        await ds.add(document)

    context = await ds.create_max_context(query, max_tokens)
    tokenizer = get_encoding("cl100k_base")

    assert isinstance(context, str)
    assert len(tokenizer.encode(context)) <= max_tokens


# @pytest.mark.asyncio
@pytest.mark.skip(reason="tmp")
async def test_create_max_context_multiple_datasets_async():
    query = "What is Python?"
    dataset1 = "programming"
    dataset2 = "animals"
    max_tokens1 = 20
    max_tokens2 = 25
    await client.dataset(dataset1).clear()
    await client.dataset(dataset2).clear()
    programming_documents = [
        "Python is a programming language.",
        "Java is another popular programming language.",
        "JavaScript is widely used for web development.",
        "C++ is commonly used for system programming.",
        "Ruby is known for its simplicity and readability.",
        "Go is a statically typed language developed by Google.",
        "Rust is a systems programming language that focuses on safety and performance.",
        "TypeScript is a superset of JavaScript that adds static typing.",
        "PHP is a server-side scripting language used for web development.",
        "Swift is a modern programming language developed by Apple for iOS app development.",
    ]
    animal_documents = [
        "Python is a type of snake.",
        "Lions are known as the king of the jungle.",
        "Elephants are the largest land animals.",
        "Giraffes are known for their long necks.",
        "Kangaroos are native to Australia.",
        "Pandas are native to China and primarily eat bamboo.",
        "Penguins live primarily in the Southern Hemisphere.",
        "Tigers are carnivorous mammals found in Asia.",
        "Whales are large marine mammals.",
        "Zebras are part of the horse family and native to Africa.",
    ]

    await client.dataset(dataset1).batch_add([{"data": d} for d in programming_documents])
    await client.dataset(dataset2).batch_add([{"data": d} for d in animal_documents])
    context = await client.create_max_context(
        [dataset1, dataset2], query, [max_tokens1, max_tokens2]
    )
    tokenizer = get_encoding("cl100k_base")

    assert isinstance(context, str)
    context_parts = context.split("\n")
    assert len(context_parts) == 2
    assert len(tokenizer.encode(context_parts[0])) <= max_tokens1
    assert len(tokenizer.encode(context_parts[1])) <= max_tokens2
