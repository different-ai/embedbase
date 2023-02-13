from typing import Coroutine, List, Optional
from pandas import DataFrame
from embedbase.db import VectorDatabase


class Weaviate(VectorDatabase):
    def __init__(
        self,
    ):
        """
        """
        pass
    async def fetch(
        self, ids: List[str], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param ids: list of ids
        :return: list of vectors
        """
        raise NotImplementedError

    async def update(
        self,
        df: DataFrame,
        namespace: Optional[str] = None,
        batch_size: Optional[int] = 100,
    ) -> Coroutine:
        """
        :param vectors: list of vectors
        :param namespace: namespace
        """
        raise NotImplementedError

    async def delete(self, ids: List[str], namespace: Optional[str] = None) -> None:
        """
        :param ids: list of ids
        """
        raise NotImplementedError

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

    async def clear(self, namespace: Optional[str]) -> None:
        """
        :param namespace: namespace
        """
        raise NotImplementedError
