# pylint: disable=missing-function-docstring
import asyncio
import os

import dotenv
import pytest
from embedbase_client import EmbedbaseAsyncClient, EmbedbaseClient
from embedbase_client.model import Metadata

dotenv.load_dotenv("../../.env")
base_url = "https://api.embedbase.xyz"
api_key = os.environ.get("EMBEDBASE_API_KEY")
print(api_key)
client = EmbedbaseClient(embedbase_url=base_url, embedbase_key=api_key)

# Dataset to be used in tests
test_dataset = "unit_test"

ds = client.dataset(test_dataset)


async_client = EmbedbaseAsyncClient(embedbase_url=base_url, embedbase_key=api_key)

async_ds = async_client.dataset(test_dataset)


@pytest.fixture(autouse=True)
def setup_and_teardown():
    yield

    # Teardown - clear the test dataset
    ds.clear()


def test_add_single_document():
    document = "This is a test document."
    metadata = {"key": "value"}

    result = ds.add(document, metadata)

    assert isinstance(result.id, str)


def test_batch_add_documents():
    documents = [
        {"data": "Document 1", "metadata": {"key": "value1"}},
        {"data": "Document 2", "metadata": {"key": "value2"}},
    ]

    results = ds.batch_add(documents)

    assert len(results) == len(documents)
    for result in results:
        assert isinstance(result.id, str)


def test_search_documents():
    # Add some documents to the dataset
    documents = [
        {"data": "Document 1", "metadata": {"key": "value1"}},
        {"data": "Document 2", "metadata": {"key": "value2"}},
    ]
    ds.batch_add(documents)

    # Perform a search
    query = "Document"
    results = ds.search(query).get()
    assert isinstance(results, list)

    # Check that the results have the expected properties
    assert len(results) > 0
    for result in results:
        assert isinstance(result.id, str)
        assert isinstance(result.data, str)
        assert isinstance(result.metadata, Metadata)
        assert isinstance(result.similarity, float)

    # Check that the results contain the expected documents
    document_datas = [result.data for result in results]
    for doc in documents:
        assert doc["data"] in document_datas


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


def test_filter_by_metadata_using_where():
    _ = [ds.add(input["data"], input["metadata"]) for input in d]

    data = ds.search("Time related").where("source", "==", "github.com").get()
    assert data is not None
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "source" in data[0].metadata and data[0].metadata["source"] == "github.com"


@pytest.mark.asyncio
async def test_filter_by_metadata_using_where_async():
    await asyncio.gather(
        *[async_ds.add(input["data"], input["metadata"]) for input in d]
    )

    data = (
        await async_ds.search("Time related").where("source", "==", "github.com").get()
    )
    assert data is not None
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "source" in data[0].metadata and data[0].metadata["source"] == "github.com"


def test_list_documents():
    # Add some documents to the dataset
    documents = [
        {"data": "Document 1", "metadata": {"key": "value1"}},
        {"data": "Document 2", "metadata": {"key": "value2"}},
    ]
    ds.batch_add(documents)

    # Perform a search
    results = ds.list().offset(0).limit(3).get()
    assert isinstance(results, list)

    # Check that the results have the expected properties
    assert len(results) > 0
    for result in results:
        assert isinstance(result.id, str)
        assert isinstance(result.data, str)
        assert isinstance(result.metadata, Metadata)

    # Check that the results contain the expected documents
    document_datas = [result.data for result in results]
    for doc in documents:
        assert doc["data"] in document_datas


@pytest.mark.asyncio
async def test_list_documents_async():
    # Add some documents to the dataset
    documents = [
        {"data": "Document 1", "metadata": {"key": "value1"}},
        {"data": "Document 2", "metadata": {"key": "value2"}},
    ]
    await async_ds.batch_add(documents)

    # Perform a search
    results = await async_ds.list().offset(0).limit(3).get()
    assert isinstance(results, list)

    # Check that the results have the expected properties
    assert len(results) > 0
    for result in results:
        assert isinstance(result.id, str)
        assert isinstance(result.data, str)
        assert isinstance(result.metadata, Metadata)

    # Check that the results contain the expected documents
    document_datas = [result.data for result in results]
    for doc in documents:
        assert doc["data"] in document_datas
