from abc import ABC, abstractmethod
from typing import Coroutine, List, Optional
import asyncio
from pandas import DataFrame
import itertools


class VectorDatabase(ABC):
    """
    Base class for all vector databases
    """

    @abstractmethod
    async def fetch(
        self, ids: List[str], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param ids: list of ids
        :param namespace: namespace
        :return: list of vectors
        """
        raise NotImplementedError

    @abstractmethod
    async def fetch_by_hash(
        self, hashes: List[str], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param hashes: list of hashes
        :param namespace: namespace
        :return: list of vectors
        """
        raise NotImplementedError

    @abstractmethod
    async def update(
        self,
        df: DataFrame,
        namespace: Optional[str] = None,
        batch_size: Optional[int] = 100,
        save_clear_data: bool = True,
    ) -> Coroutine:
        """
        :param vectors: list of vectors
        :param namespace: namespace
        :param batch_size: batch size
        :param save_clear_data: save clear data
        """
        raise NotImplementedError

    @abstractmethod
    async def delete(self, ids: List[str], namespace: Optional[str] = None) -> None:
        """
        :param ids: list of ids
        """
        raise NotImplementedError

    @abstractmethod
    async def search(
        self, vector: List[float], top_k: Optional[int], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param vector: vector
        :param top_k: top k
        :param namespace: namespace
        :return: list of vectors
        """
        raise NotImplementedError

    @abstractmethod
    async def clear(self, namespace: Optional[str] = None) -> None:
        """
        :param namespace: namespace
        """
        raise NotImplementedError


async def batch_fetch(
    vector_database: VectorDatabase, ids_to_fetch: List[str], namespace: str
):
    """
    :param vector_database: vector database
    :param ids_to_fetch: list of ids
    :param namespace: namespace
    """
    n = 200
    ids_to_fetch = [ids_to_fetch[i : i + n] for i in range(0, len(ids_to_fetch), n)]

    async def _fetch(ids) -> List[dict]:
        try:
            return await vector_database.fetch(ids=ids, namespace=namespace)
        except Exception as e:
            raise e

    existing_documents = await asyncio.gather(*[_fetch(ids) for ids in ids_to_fetch])
    return itertools.chain.from_iterable(existing_documents)
