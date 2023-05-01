import asyncio
import itertools
from typing import List, Optional

from embedbase.database.base import VectorDatabase


# TODO: move this to VectorDatabase
async def batch_select(
    vector_database: VectorDatabase,
    ids: Optional[List[str]] = [],
    hashes: Optional[List[str]] = [],
    dataset_id: Optional[str] = None,
    user_id: Optional[str] = None,
):
    """
    :param vector_database: vector database
    :param ids: list of ids
    :param hahes: list of hashes
    :param dataset_id: dataset id
    :param user_id: user id
    """
    # either hashes or ids should be provided
    assert (
        len(ids) > 0 or len(hashes) > 0
    ), "ids or hashes should be provided"

    if len(ids) > 0:
        # this depend on the vector database used
        # supabase cannot deal with 200 for example
        n = 50
        elements = [ids[i : i + n] for i in range(0, len(ids), n)]

        async def _fetch(elements) -> List[dict]:
            try:
                return await vector_database.select(
                    ids=elements, dataset_id=dataset_id, user_id=user_id
                )
            except Exception as e:
                raise e

        existing_documents = await asyncio.gather(
            *[_fetch(element) for element in elements]
        )
        return itertools.chain.from_iterable(existing_documents)
    else:
        n = 50
        elements = [hashes[i : i + n] for i in range(0, len(hashes), n)]

        async def _fetch(elements) -> List[dict]:
            try:
                return await vector_database.select(
                    hashes=elements, dataset_id=dataset_id, user_id=user_id
                )
            except Exception as e:
                raise e

        existing_documents = await asyncio.gather(
            *[_fetch(element) for element in elements]
        )
        return itertools.chain.from_iterable(existing_documents)
