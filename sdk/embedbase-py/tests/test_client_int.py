# pylint: disable=missing-function-docstring
import os

import dotenv
import pytest
from embedbase_client import EmbedbaseClient
from embedbase_client.model import Document, Metadata

dotenv.load_dotenv("../../.env")
base_url = "https://api.embedbase.xyz"
api_key = os.environ.get("EMBEDBASE_API_KEY")
bankrupt_api_key = os.environ.get("BANKRUPT_EMBEDBASE_KEY")
client = EmbedbaseClient(embedbase_url=base_url, embedbase_key=api_key, timeout=120)

# Dataset to be used in tests
test_dataset = os.environ.get("EMBEDBASE_DATASET", "unit_test")

ds = client.dataset(test_dataset)


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


def test_sync_client_got_timeout():
    assert (
        EmbedbaseClient(
            embedbase_url=base_url, embedbase_key=api_key, timeout=3
        ).timeout
        == 3
    )


# @pytest.mark.skip(reason="todo")
# def test_sync_client_generate_should_receive_maxed_out_plan_error():
#     bankrupt_base = EmbedbaseClient(
#         embedbase_url=base_url, embedbase_key=bankrupt_api_key
#     )

#     with pytest.raises(Exception) as e:
#         for res in bankrupt_base.generate("hello"):
#             assert res is not None
#     assert (
#         str(e.value)
#         == "Plan limit exceeded, please upgrade on the dashboard. If you are building open-source, please contact us at louis@embedbase.xyz"
#     )


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


def test_sync_client_generate():
    result = client.generate_text("openai/gpt-3.5-turbo", "hello")
    assert isinstance(result, str)


def test_sync_client_use_model_generate():
    gpt3 = client.use_model("openai/gpt-3.5-turbo")
    result = gpt3.generate_text("hello")
    assert isinstance(result, str)


def test_sync_client_stream():
    for chunk in client.stream_text("openai/gpt-3.5-turbo", "hello"):
        assert isinstance(chunk, str)


def test_sync_client_use_model_stream():
    gpt3 = client.use_model("openai/gpt-3.5-turbo")
    for chunk in gpt3.stream_text("hello"):
        assert isinstance(chunk, str)


def test_sync_client_use_model_stream():
    models = client.get_models()
    assert isinstance(models, list)
