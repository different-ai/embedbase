from typing import Coroutine, List, Optional, Union

from abc import ABC, abstractmethod

from pandas import DataFrame
from pydantic import BaseModel

from embedbase.models import Document


# TODO use pydantic validation
class Dataset(BaseModel):
    dataset_id: str
    documents_count: int
    created_at: Optional[str]


class SearchResponse(Document):
    score: float


class SelectResponse(Document):
    pass

class WhereResponse(Document):
    pass


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
        where: Optional[Union[dict, List[dict]]] = None,
    ) -> List[SearchResponse]:
        """
        :param vector: vector the similarity is calculated against
        :param top_k: top k number of results returned
        :param dataset_id: dataset id
        :param user_id: user id
        :param where: where condition to filter results
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

    @abstractmethod
    async def list(
        self,
        dataset_id: str,
        user_id: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[Document]:
        """
        Returns a list of Documents in a dataset
        :param dataset_id: dataset id
        :param user_id: user id
        :param offset: offset
        :param limit: limit
        :return: list of documents
        """
        raise NotImplementedError

    @abstractmethod
    async def where(
        self,
        dataset_id: Optional[str] = None,
        user_id: Optional[str] = None,
        where: Optional[Union[dict, List[dict]]] = None,
    ) -> List[WhereResponse]:
        """
        :param dataset_id: dataset id
        :param user_id: user id
        :param where: where condition to filter results
        :return: list of documents
        """
        raise NotImplementedError
