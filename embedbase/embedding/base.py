from abc import ABC, abstractmethod
from typing import List, Union


class Embedder(ABC):
    """
    Base class for all embedders
    """

    @property
    @abstractmethod
    def dimensions(self) -> int:
        """
        Return the dimensions of the embeddings
        :return: dimensions of the embeddings
        """

    @abstractmethod
    def is_too_big(self, text: str) -> bool:
        """
        Check if text is too big to be embedded,
        delegating the splitting UX to the caller
        :param text: text to check
        :return: True if text is too big, False otherwise
        """

    @abstractmethod
    async def embed(self, data: Union[List[str], str]) -> List[List[float]]:
        """
        Embed a list of strings or a string
        :param data: list of strings or a string
        :return: list of embeddings
        """
