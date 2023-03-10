# an enum to pick from either pinecone, weaviate, or supabase
import asyncio
import itertools
from enum import Enum
from typing import List, Optional

from embedbase.db import VectorDatabase
from embedbase.pinecone_db import Pinecone
from embedbase.settings import Settings, VectorDatabaseEnum
from embedbase.supabase_db import Supabase
from embedbase.weaviate_db import Weaviate


async def batch_select(
    vector_database: VectorDatabase,
    hashes_to_fetch: List[str],
    dataset_id: Optional[str] = None,
    user_id: Optional[str] = None,
):
    """
    :param vector_database: vector database
    :param hashes_to_fetch: list of hashes
    :param dataset_id: dataset id
    :param user_id: user id
    """
    n = 200
    hashes_to_fetch = [
        hashes_to_fetch[i : i + n] for i in range(0, len(hashes_to_fetch), n)
    ]

    async def _fetch(hashes) -> List[dict]:
        try:
            return await vector_database.select(
                hashes=hashes, dataset_id=dataset_id, user_id=user_id
            )
        except Exception as e:
            raise e

    existing_documents = await asyncio.gather(*[_fetch(ids) for ids in hashes_to_fetch])
    return itertools.chain.from_iterable(existing_documents)


def get_vector_database(settings: Settings) -> VectorDatabase:
    if settings.vector_database == VectorDatabaseEnum.pinecone:
        return Pinecone(
            api_key=settings.pinecone_api_key,
            environment=settings.pinecone_environment,
            index_name=settings.pinecone_index,
        )
    elif settings.vector_database == VectorDatabaseEnum.supabase:
        return Supabase(
            url=settings.supabase_url,
            key=settings.supabase_key,
        )
    elif settings.vector_database == VectorDatabaseEnum.weaviate:
        return Weaviate()
    else:
        raise Exception(
            "Invalid vector database, it must be pinecone, supabase or weaviate"
        )
