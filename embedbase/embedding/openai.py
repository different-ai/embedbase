from typing import List, Union, Optional

from tenacity import (
    retry,
    retry_if_not_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from embedbase.embedding.base import Embedder

try:
    import openai
except:
    pass


@retry(
    wait=wait_exponential(multiplier=1, min=1, max=3),
    stop=stop_after_attempt(3),
    # TODO: send pr/issue on https://github.com/openai/openai-python/blob/94428401b4f71596e4a1331102a6beee9d8f0bc4/openai/__init__.py#L25
    # To expose openai.AuthenticationError
    retry=retry_if_not_exception_type(openai.InvalidRequestError),
)
def embed_retry(
    data: List[str],
) -> List[dict]:
    """
    Embed a list of sentences and retry on failure
    :param data: list of sentences to embed
    :param provider: which provider to use
    :return: list of embeddings
    """
    return [
        e["embedding"]
        for e in openai.Embedding.create(input=data, model="text-embedding-ada-002")[
            "data"
        ]
    ]


class OpenAI(Embedder):
    """
    OpenAI Embedder
    """

    EMBEDDING_MODEL = "text-embedding-ada-002"
    EMBEDDING_CTX_LENGTH = 8191
    EMBEDDING_ENCODING = "cl100k_base"

    def __init__(
        self, openai_api_key: str, openai_organization: Optional[str] = None
    ):
        super().__init__()
        try:
            import openai
            import tiktoken
        except ImportError:
            raise ImportError(
                "OpenAI is not installed. Install it with `pip install openai tiktoken`"
            )

        self.encoding = tiktoken.get_encoding(self.EMBEDDING_ENCODING)
        openai.api_key = openai_api_key
        openai.organization = openai_organization

    @property
    def dimensions(self) -> int:
        return 1536

    def is_too_big(self, text: str) -> bool:
        tokens = self.encoding.encode(text)
        if len(tokens) > self.EMBEDDING_CTX_LENGTH:
            return True

        return False

    async def embed(self, data: Union[List[str], str]) -> List[List[float]]:
        return embed_retry(data)
