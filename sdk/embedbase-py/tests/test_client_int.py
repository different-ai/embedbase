# pylint: disable=missing-function-docstring
import asyncio
import os

import dotenv
import pytest
from embedbase_client import EmbedbaseAsyncClient, EmbedbaseClient
from embedbase_client.model import Metadata, Document

dotenv.load_dotenv("../../.env")
base_url = "https://api.embedbase.xyz"
api_key = os.environ.get("EMBEDBASE_API_KEY")
bankrupt_api_key = os.environ.get("BANKRUPT_EMBEDBASE_KEY")
client = EmbedbaseClient(embedbase_url=base_url, embedbase_key=api_key, timeout=120)

# Dataset to be used in tests
test_dataset = os.environ.get("EMBEDBASE_DATASET", "unit_test")

ds = client.dataset(test_dataset)


async_client = EmbedbaseAsyncClient(
    embedbase_url=base_url, embedbase_key=api_key, timeout=120
)

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
    ds.clear()
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
    await async_ds.clear()
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


def test_sync_client_got_timeout():
    assert (
        EmbedbaseClient(
            embedbase_url=base_url, embedbase_key=api_key, timeout=3
        ).timeout
        == 3
    )


@pytest.mark.asyncio
async def test_async_client_generate():
    async for result in async_client.generate("hello"):
        assert isinstance(result, str)


def test_sync_client_generate():
    for result in client.generate("hello"):
        assert isinstance(result, str)

def test_sync_client_generate_spanish():
    results = ''.join([result for result in client.generate("hola ablos")])
    print(results)



# @pytest.mark.asyncio
@pytest.skip
async def test_async_client_generate_should_receive_maxed_out_plan_error():
    bankrupt_base = EmbedbaseAsyncClient(
        embedbase_url=base_url, embedbase_key=bankrupt_api_key
    )

    with pytest.raises(Exception) as e:
        async for res in bankrupt_base.generate("hello"):
            assert res is not None
    assert (
        str(e.value)
        == "Plan limit exceeded, please upgrade on the dashboard. If you are building open-source, please contact us at louis@embedbase.xyz"
    )

@pytest.skip
def test_sync_client_generate_should_receive_maxed_out_plan_error():
    bankrupt_base = EmbedbaseClient(
        embedbase_url=base_url, embedbase_key=bankrupt_api_key
    )

    with pytest.raises(Exception) as e:
        for res in bankrupt_base.generate("hello"):
            assert res is not None
    assert (
        str(e.value)
        == "Plan limit exceeded, please upgrade on the dashboard. If you are building open-source, please contact us at louis@embedbase.xyz"
    )


@pytest.mark.asyncio
async def test_merge_datasets():
    ds_one = f"{test_dataset}_organic_ingredients"
    ds_two = f"{test_dataset}_cake_recipes"
    await async_client.dataset(ds_one).clear()
    await async_client.dataset(ds_two).clear()
    await async_client.dataset(ds_one).batch_add(
        [
            {
                "data": "flour",
                "metadata": {"source": "organic.com", "path": "https://organic.com"},
            },
            {
                "data": "eggs",
                "metadata": {"source": "organic.com", "path": "https://organic.com"},
            },
            {
                "data": "milk",
                "metadata": {"source": "organic.com", "path": "https://organic.com"},
            },
        ]
    )
    await async_client.dataset(ds_two).batch_add(
        [
            {
                "data": "Cake recipe: 1. Mix flour, eggs and milk. 2. Bake for 30 minutes.",
                "metadata": {
                    "source": "recipe.com",
                    "path": "https://recipe.com",
                    "ingredients": ["flour", "eggs", "milk"],
                },
            }
        ]
    )

    question = "How to make a cake ?"
    [results_one, results_two] = await asyncio.gather(
        *[
            async_client.dataset(ds_one).search(question, limit=6).get(),
            async_client.dataset(ds_two).search(question, limit=1).get(),
        ]
    )
    assert len(results_one) == 3
    assert len(results_two) == 1


@pytest.mark.asyncio
async def test_too_long_add_should_show_right_error():
    with pytest.raises(Exception) as e:
        await async_ds.add("a" * 100000)
    assert (
        str(e.value)
        == "Document is too long, please split it into smaller documents, please see https://docs.embedbase.xyz/document-is-too-long"
    )


# @pytest.mark.asyncio
@pytest.mark.skip(reason="TODO")
async def test_too_long_for_request():
    # timeout after 5 seconds
    timeout_client = EmbedbaseAsyncClient(
        embedbase_url=base_url, embedbase_key=api_key, timeout=5
    )
    with pytest.raises(Exception) as e:
        await timeout_client.dataset(test_dataset).add("a" * 10000000)
    # todo handle use case error handling better


@pytest.mark.asyncio
async def test_async_chunk_and_batch_add():
    documents = [
        {
            "data": " ".join(["hello"] * 1000),
            "metadata": {"hello": "world"},
        },
        {
            "data": " ".join(["hella"] * 1000),
            "metadata": {"hello": "world"},
        },
    ]
    await async_ds.clear()
    result = await async_ds.chunk_and_batch_add(documents)
    assert result is not None
    # should be a list of document
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0].data == documents[0]["data"]
    assert isinstance(result[0], Document)

def test_chunk_and_batch_add():
    documents = [
        {
            "data": " ".join(["hello"] * 1000),
            "metadata": {"hello": "world"},
        },
        {
            "data": " ".join(["hella"] * 1000),
            "metadata": {"hello": "world"},
        },
    ]
    ds.clear()
    result = ds.chunk_and_batch_add(documents)
    assert result is not None
    # should be a list of document
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0].data == documents[0]["data"]
    assert isinstance(result[0], Document)
