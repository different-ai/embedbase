from abc import ABC, abstractmethod
from typing import Coroutine, List, Optional, Tuple

from pandas import DataFrame

# TODO: make this less Pinecone specific
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
