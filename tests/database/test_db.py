"""
Tests at the database abstraction level.
"""

from typing import List

import hashlib
import uuid

import numpy as np
import pandas as pd
import pytest
from sentence_transformers import SentenceTransformer

from embedbase.database import VectorDatabase
from embedbase.database.memory_db import MemoryDatabase
from embedbase.database.postgres_db import Postgres
from embedbase.database.supabase_db import Supabase
from embedbase.settings import get_settings_from_file
from tests.test_utils import unit_testing_dataset

vector_databases: List[VectorDatabase] = []

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
# small optimisation would be use mps for local dev


# before running any test initialize the databases
@pytest.fixture(scope="session", autouse=True)
def init_databases():
    settings = get_settings_from_file()

    try:
        vector_databases.append(Postgres())
    except:  # pylint: disable=bare-except
        print("Postgres dependency not installed, skipping")
    vector_databases.append(MemoryDatabase())
    try:
        vector_databases.append(
            Supabase(
                url=settings.supabase_url,
                key=settings.supabase_key,
            )
        )
    except:  # pylint: disable=bare-except
        print("Supabase dependency not installed, skipping")


@pytest.mark.asyncio
async def test_search():
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = [
        # random embedding of length 1536
        np.random.rand(1536).tolist(),
        np.random.rand(1536).tolist(),
    ]
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": embedding,
                "id": str(uuid.uuid4()),
                "metadata": {"test": "test"},
            }
            for i, embedding in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash", "metadata"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.search(
            embeddings[0],
            top_k=2,
            dataset_ids=[unit_testing_dataset],
        )
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0].id == df.id[0], f"failed for {vector_database}"
        assert results[0].data == d[0], f"failed for {vector_database}"
        assert len(results[0].embedding) > 0, f"failed for {vector_database}"
        assert results[0].score > 0, f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_fetch():
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = [
        [0.0] * 1536,
        [0.0] * 1536,
    ]
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": embedding,
                "id": str(uuid.uuid4()),
                "metadata": {"test": "test"},
            }
            for i, embedding in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash", "metadata"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.select(
            ids=[df.id[0]], dataset_id=unit_testing_dataset
        )
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0].id == df.id[0], f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_fetch_by_hash():
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = [
        [0.0] * 1536,
        [0.0] * 1536,
    ]
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": embedding,
                "id": str(uuid.uuid4()),
                "metadata": {"test": "test"},
            }
            for i, embedding in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash", "metadata"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.select(
            hashes=[df.hash[0]], dataset_id=unit_testing_dataset
        )
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0].id == df.id[0], f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_clear():
    data = [
        # random numpy array of length 1536
        np.random.rand(1536).tolist(),
        np.random.rand(1536).tolist(),
    ]
    df = pd.DataFrame(
        [
            {
                "data": "Bob is a human",
                "embedding": embedding,
                "id": str(uuid.uuid4()),
                "metadata": {"test": "test"},
            }
            for i, embedding in enumerate(data)
        ],
        columns=["data", "embedding", "id", "hash", "metadata"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.search(
            data[0],
            top_k=2,
            dataset_ids=[unit_testing_dataset],
        )
        ids = [result.id for result in results]
        assert ids[0] == df.id[0], f"failed for {vector_database}"
        assert ids[1] == df.id[1], f"failed for {vector_database}"
        # check there is score
        assert results[0].score >= 0, f"failed for {vector_database}"
        await vector_database.clear(unit_testing_dataset)

    for vector_database in vector_databases:
        results = await vector_database.search(
            data[0],
            top_k=2,
            dataset_ids=[unit_testing_dataset],
        )
        assert len(results) == 0, f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_upload():
    data = [
        # random numpy array of length 1536
        np.random.rand(1536).tolist(),
        np.random.rand(1536).tolist(),
    ]
    df = pd.DataFrame(
        [
            {
                "data": "Bob is a human",
                "embedding": embedding,
                "id": str(uuid.uuid4()),
                "metadata": {"test": "test"},
            }
            for i, embedding in enumerate(data)
        ],
        columns=[
            "data",
            "embedding",
            "id",
            "hash",
            "metadata",
        ],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)

        results = await vector_database.search(
            data[0],
            top_k=2,
            dataset_ids=[unit_testing_dataset],
        )
        ids = [result.id for result in results]
        assert ids[0] == df.id[0], f"failed for {vector_database}"
        assert ids[1] == df.id[1], f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_batch_select_large_content():
    """
    should not throw an error
    """
    d = []
    for i in range(1000):
        d.append("a" * i)
    hashes = [hashlib.sha256(x.encode()).hexdigest() for x in d]
    for vector_database in vector_databases:
        # add documents
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(
            pd.DataFrame(
                [
                    {
                        "data": x,
                        "embedding": [0.0] * 1536,
                        "id": str(uuid.uuid4()),
                        "metadata": {"test": "test"},
                        "hash": hashes[i],
                    }
                    for i, x in enumerate(d)
                ],
                columns=["data", "embedding", "id", "hash", "metadata"],
            ),
            unit_testing_dataset,
        )
        results = await vector_database.select(
            hashes=list(set(hashes)),
            dataset_id=unit_testing_dataset,
            user_id=None,
        )
        assert len(list(results)) == len(d), f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_distinct():
    d = []
    for i in range(1000):
        d.append("foo")
    hashes = [hashlib.sha256(x.encode()).hexdigest() for x in d]
    for vector_database in vector_databases:
        # TODO currently distinct only supported on supabase
        if not isinstance(vector_database, Supabase):
            continue
        # add documents
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(
            pd.DataFrame(
                [
                    {
                        "data": x,
                        "embedding": [0.0] * 1536,
                        "id": str(uuid.uuid4()),
                        "metadata": {"test": "test"},
                        "hash": hashes[i],
                    }
                    for i, x in enumerate(d)
                ],
                columns=["data", "embedding", "id", "hash", "metadata"],
            ),
            unit_testing_dataset,
        )
        results = await vector_database.select(
            hashes=list(set(hashes)),
            dataset_id=unit_testing_dataset,
            user_id=None,
        )
        # should only return one result
        assert len(list(results)) == 1, f"failed for {vector_database}"


d = [
    {
        "data": "Alice invited Bob at 6 PM",
        "metadata": {"source": "notion.so", "path": "https://notion.so/alice"},
    },
    {
        "data": "John pushed code at 8 AM",
        "metadata": {
            "source": "github.com",
            "path": "https://github.com/john/john",
        },
    },
    {
        "data": "The lion is the king of the savannah",
        "metadata": {
            "source": "wikipedia.org",
            "path": "https://en.wikipedia.org/wiki/Lion",
        },
    },
]


def pad_to_1536(x):
    return x + [0.0] * (1536 - len(x))


@pytest.mark.asyncio
async def test_search_with_where():
    """
    should not throw an error
    """

    for vector_database in vector_databases:
        if isinstance(vector_database, Postgres):
            continue
        # add documents
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(
            pd.DataFrame(
                [
                    {
                        "data": x["data"],
                        "embedding": pad_to_1536(model.encode(x["data"]).tolist()),
                        "id": str(uuid.uuid4()),
                        "metadata": x["metadata"],
                        "hash": hashlib.sha256(x["data"].encode()).hexdigest(),
                    }
                    for i, x in enumerate(d)
                ],
                columns=["data", "embedding", "id", "hash", "metadata"],
            ),
            unit_testing_dataset,
        )
        results = await vector_database.search(
            pad_to_1536(model.encode("Time related").tolist()),
            top_k=2,
            dataset_ids=[unit_testing_dataset],
            where={"source": "github.com"},
        )
        assert len(results) == 1, f"failed for {vector_database}"
        assert (
            results[0].metadata["source"] == "github.com"
        ), f"failed for {vector_database}"
        assert (
            results[0].data == "John pushed code at 8 AM"
        ), f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_delete_with_where():
    pass


@pytest.mark.asyncio
async def test_update_with_where():
    d = [
        {
            "data": "Alice invited Bob at 6 PM",
            "metadata": {"source": "notion.so", "path": "https://notion.so/alice"},
        },
        {
            "data": "John invited Bob at 6 PM",
            "metadata": {"source": "notion.so", "path": "https://notion.so/john"},
        },
        {
            "data": "Paul invited John at 3 PM",
            "metadata": {"source": "notion.so", "path": "https://notion.so/john"},
        },
    ]
    for vector_database in vector_databases:
        if isinstance(vector_database, Postgres):
            continue
        if isinstance(vector_database, MemoryDatabase):
            continue

        # add documents
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(
            pd.DataFrame(
                [
                    {
                        "data": x["data"],
                        "embedding": pad_to_1536(model.encode(x["data"]).tolist()),
                        "id": str(uuid.uuid4()),
                        "metadata": x["metadata"],
                        "hash": hashlib.sha256(x["data"].encode()).hexdigest(),
                    }
                    for i, x in enumerate(d)
                ],
                columns=["data", "embedding", "id", "hash", "metadata"],
            ),
            unit_testing_dataset,
        )
        results = await vector_database.update(
            pd.DataFrame(
                [
                    {
                        # lets replace PM by AM
                        "data": x["data"].replace("PM", "AM"),
                    }
                    for i, x in enumerate(d)
                ],
                columns=["data", "embedding", "id", "hash", "metadata"],
            ),
            unit_testing_dataset,
            where={"source": "notion.so"},
        )
        assert results == 3, f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_select_with_where():
    pass


@pytest.mark.asyncio
async def test_unsupported_unicode_sequence_is_handled_in_postgres_based_db():
    settings = get_settings_from_file()

    # {'code': '22P05', 'details': '\\u0000 cannot be converted to text.', 'hint': None, 'message': 'unsupported Unicode escape sequence'}
    # try to add some data with unicode, shoudlnt crash
    d = [
        {
            "data": "Alice invited Bob at 6 PM 🙏",
            "metadata": {"source": "notion.so", "path": "https://notion.so/alice"},
        },
        {
            "data": "John pushed code at 8 AM \U0001F600",
            "metadata": {
                "source": "github.com",
                "path": "https://github.com/john/john",
            },
        },
        {
            "data": "The lion is the king of the savannah \\u0000",
            "metadata": {
                "source": "wikipedia.org",
                "path": "https://en.wikipedia.org/wiki/Lion",
            },
        },
    ]
    for db in [
        Supabase(
            url=settings.supabase_url,
            key=settings.supabase_key,
        ),
        Postgres(),
    ]:
        await db.clear(unit_testing_dataset)
        await db.update(
            pd.DataFrame(
                [
                    {
                        "data": x["data"],
                        "embedding": [0.0] * 1536,
                        "id": str(uuid.uuid4()),
                        "metadata": x["metadata"],
                        "hash": hashlib.sha256(x["data"].encode()).hexdigest(),
                    }
                    for i, x in enumerate(d)
                ],
                columns=["data", "embedding", "id", "hash", "metadata"],
            ),
            unit_testing_dataset,
        )


@pytest.mark.asyncio
async def test_embeddings_are_array_of_float():
    e = np.random.rand(1536).tolist()
    for db in vector_databases:
        # add documents
        await db.clear(unit_testing_dataset)
        await db.update(
            pd.DataFrame(
                [
                    {
                        "data": x["data"],
                        "embedding": e,
                        "id": str(uuid.uuid4()),
                        "metadata": x["metadata"],
                        "hash": hashlib.sha256(x["data"].encode()).hexdigest(),
                    }
                    for i, x in enumerate(d)
                ],
            ),
            unit_testing_dataset,
        )
        results = await db.search(
            e,
            top_k=2,
            dataset_ids=[unit_testing_dataset],
        )
        assert len(results) == 2, f"failed for {db}"

        # embedding should a list of float
        assert isinstance(results[0].embedding, list), f"failed for {db}"
        assert isinstance(results[0].embedding[0], float), f"failed for {db}"

        # same for select
        results = await db.select(
            dataset_id=unit_testing_dataset,
            hashes=[hashlib.sha256(x["data"].encode()).hexdigest() for x in d],
        )
        assert len(results) == 3, f"failed for {db}"

        # embedding should a list of float
        assert isinstance(results[0].embedding, list), f"failed for {db}"
        assert isinstance(results[0].embedding[0], float), f"failed for {db}"
