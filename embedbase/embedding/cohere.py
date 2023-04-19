from typing import Any, List, Union
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
)

from embedbase.embedding.base import Embedder


@retry(
    wait=wait_exponential(multiplier=1, min=1, max=3),
    stop=stop_after_attempt(3),
)
def embed_retry(
    co: Any,
    data: List[str],
) -> List[dict]:
    """
    Embed a list of sentences and retry on failure
    :param data: list of sentences to embed
    :param provider: which provider to use
    :return: list of embeddings
    """
    return co.embed(data).embeddings


class Cohere(Embedder):
    """
    Cohere Embedder
    """

    def __init__(self, cohere_api_key: str):
        super().__init__()
        try:
            import cohere
        except ImportError:
            raise ImportError(
                "Cohere is not installed. Install it with `pip install cohere`"
            )

        self.co = cohere.Client(cohere_api_key)
        raise NotImplementedError()

    @property
    def dimensions(self) -> int:
        return 4096

    def is_too_big(self, text: str) -> bool:
        raise NotImplementedError()

    async def embed(self, data: Union[List[str], str]) -> List[List[float]]:
        return embed_retry(self.co, data)
