import typing
import numpy as np
import openai
from tenacity import (
    retry,
    retry_if_not_exception_type,
    stop_after_attempt,
    wait_exponential,
)
import tiktoken
from embedbase.settings import EmbeddingProvider, get_settings
from embedbase.utils import batched

EMBEDDING_MODEL = "text-embedding-ada-002"
EMBEDDING_CTX_LENGTH = 8191
EMBEDDING_ENCODING = "cl100k_base"
try:
    import cohere

    settings = get_settings()
    co = cohere.Client(settings.cohere_api_key)
except ImportError:
    pass


def is_too_big(text: str):
    # TODO: cohere
    encoding = tiktoken.get_encoding(EMBEDDING_ENCODING)
    tokens = encoding.encode(text)
    if len(tokens) > EMBEDDING_CTX_LENGTH:
        return True

    return False


@retry(
    wait=wait_exponential(multiplier=1, min=1, max=3),
    stop=stop_after_attempt(3),
    # TODO: send pr/issue on https://github.com/openai/openai-python/blob/94428401b4f71596e4a1331102a6beee9d8f0bc4/openai/__init__.py#L25
    # To expose openai.AuthenticationError
    retry=retry_if_not_exception_type(openai.InvalidRequestError),
)
def embed(
    input: typing.List[str],
    provider: EmbeddingProvider = EmbeddingProvider.OPENAI,
) -> typing.List[dict]:
    """
    Embed a list of sentences and retry on failure
    :param input: list of sentences to embed
    :param provider: which provider to use
    :return: list of embeddings
    """
    if provider == EmbeddingProvider.OPENAI:
        return [
            e["embedding"]
            for e in openai.Embedding.create(
                input=input, model="text-embedding-ada-002"
            )["data"]
        ]
    elif provider == EmbeddingProvider.COHERE:
        return co.embed(input).embeddings


def chunked_tokens(text, encoding_name, chunk_length):
    encoding = tiktoken.get_encoding(encoding_name)
    tokens = encoding.encode(text)
    chunks_iterator = batched(tokens, chunk_length)
    yield from chunks_iterator

# TODO: atm dead code - this can embed texts of any length - but we
# delegate the responsibility of chunking to the caller instead
# for a better UX
def batch_embed(
    texts,
    model=EMBEDDING_MODEL,
    max_tokens=EMBEDDING_CTX_LENGTH,
    encoding_name=EMBEDDING_ENCODING,
    average=True,
):
    chunk_embeddings = []
    chunk_lens = []
    chunks = []
    for text in texts:
        for chunk in chunked_tokens(
            text, encoding_name=encoding_name, chunk_length=max_tokens
        ):
            chunks.append(chunk)
            # chunk_embeddings.append(embed(chunk, model=model))
            chunk_lens.append(len(chunk))
    chunk_embeddings = embed(chunks, model=model)
    if average:
        # average the embeddings of the chunks,
        # len(chunk_embeddings) == len(texts)
        chunk_embeddings = [
            np.mean(chunk_embeddings[i : i + chunk_lens[i]], axis=0).tolist()
            for i in range(len(texts))
        ]
    return chunk_embeddings
