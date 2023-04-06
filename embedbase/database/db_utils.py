# an enum to pick from either pinecone, weaviate, or supabase
import asyncio
import itertools
from typing import List, Optional

from embedbase.database.base import VectorDatabase

# TODO: move this to VectorDatabase
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
    # this depend on the vector database used
    # supabase cannot deal with 200 for example
    n = 50
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

    existing_documents = await asyncio.gather(*[_fetch(hashes) for hashes in hashes_to_fetch])
    return itertools.chain.from_iterable(existing_documents)

