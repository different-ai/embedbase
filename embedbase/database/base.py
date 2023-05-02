from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Coroutine, List, Optional
from pandas import DataFrame

@dataclass
class Dataset:
    dataset_id: str
    documents_count: int

@dataclass
class SearchResponse:
    score: float
    id: str
    data: str
    hash: str
    embedding: List[float]
    metadata: dict

@dataclass
class SelectResponse:
    id: str
    data: str
    hash: str
    embedding: List[float]
    metadata: dict

class VectorDatabase(ABC):
    """
    Base class for all vector databases
    """
    def __init__(self, dimensions: int = 1536):
        self._dimensions = dimensions

    @abstractmethod
    async def select(
        self,
        ids: List[str] = [],
        hashes: List[str] = [],
        dataset_id: Optional[str] = None,
        user_id: Optional[str] = None,
        distinct: bool = True,
    ) -> List[SelectResponse]:
        """
        :param ids: list of ids
        :param hashes: list of hashes
        :param dataset_id: dataset id
        :param user_id: user id
        :param distinct: distinct
        :return: list of documents
        """
        raise NotImplementedError

    @abstractmethod
    async def update(
        self,
        df: DataFrame,
        dataset_id: str,
        user_id: Optional[str] = None,
        batch_size: Optional[int] = 100,
        store_data: bool = True,
    ) -> Coroutine:
        """
        :param df: dataframe
        :param dataset_id: dataset id
        :param user_id: user id
        :param batch_size: batch size
        :param store_data: store data in database?
        """
        raise NotImplementedError

    @abstractmethod
    async def delete(
        self, ids: List[str], dataset_id: str, user_id: Optional[str] = None
    ) -> None:
        """
        :param ids: list of ids
        :param dataset_id: dataset id
        :param user_id: user id
        """
        raise NotImplementedError

    @abstractmethod
    async def search(
        self,
        vector: List[float],
        top_k: Optional[int],
        dataset_ids: List[str],
        user_id: Optional[str] = None,
    ) -> List[SearchResponse]:
        """
        :param vector: vector
        :param top_k: top k
        :param dataset_id: dataset id
        :param user_id: user id
        :return: list of documents
        """
        raise NotImplementedError

    @abstractmethod
    async def clear(self, dataset_id: str, user_id: Optional[str] = None) -> None:
        """
        :param dataset_id: dataset id
        :param user_id: user id
        """
        raise NotImplementedError

    @abstractmethod
    async def get_datasets(self, user_id: Optional[str] = None) -> List[Dataset]:
        """
        :param user_id: user id
        :return: list of datasets
        """
        raise NotImplementedError
