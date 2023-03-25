from abc import ABC, abstractmethod
import typing


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
    async def embed(self, input: typing.List[str]) -> typing.List[typing.List[float]]:
        """
        Embed a list of texts
        :param texts: list of texts
        :return: list of embeddings
        """
