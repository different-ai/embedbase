from typing import List, Optional

from tiktoken import get_encoding

MAX_CHUNK_LENGTH = 8191
EMBEDDING_ENCODING = "cl100k_base"
CHUNK_OVERLAP = 0


class SplitTextChunk:
    def __init__(self, chunk: str, start: int, end: int):
        self.chunk = chunk
        self.start = start
        self.end = end

    def __repr__(self):
        return (
            f"SplitTextChunk(chunk='{self.chunk}', start={self.start}, end={self.end})"
        )


def split_text(
    text: str,
    max_tokens: int = MAX_CHUNK_LENGTH,
    chunk_overlap: int = CHUNK_OVERLAP,
    encoding_name: str = EMBEDDING_ENCODING,
) -> List[SplitTextChunk]:
    """
    Split a text into chunks of max_tokens length.
    Depending on the model used, you may want to adjust the max_tokens and chunk_overlap parameters.
    For example, if you use the OpenAI embeddings model, you can use max_tokens of 500 and chunk_overlap of 200.
    While if you use "all-MiniLM-L6-v2" of sentence-transformers, you might use max_tokens of 30 and chunk_overlap of 20
    because the model has a relatively limited input size.
    (embedbase cloud use openai model at the moment)

    ### Example

    ```python
    text = "This is a sample text to demonstrate the usage of the split_text function. \
    It can be used to split long texts into smaller chunks based on the max_tokens value given. \
    This is useful when using models that have a limited input size."

    # Split the text into chunks of maximum 10 tokens
    chunks = split_text(text, max_tokens=10)
    ```
    """
    if chunk_overlap >= max_tokens:
        raise ValueError("Cannot have chunkOverlap >= chunkSize")

    tokenizer = get_encoding(encoding_name)

    input_ids = tokenizer.encode(text)
    chunk_size = max_tokens

    start_idx = 0
    cur_idx = min(start_idx + chunk_size, len(input_ids))
    chunk_ids = input_ids[start_idx:cur_idx]

    chunks = []

    while start_idx < len(input_ids):
        chunk = tokenizer.decode(chunk_ids)
        chunk_item = SplitTextChunk(chunk, start_idx, cur_idx)
        chunks.append(chunk_item)
        start_idx += chunk_size - chunk_overlap
        cur_idx = min(start_idx + chunk_size, len(input_ids))
        chunk_ids = input_ids[start_idx:cur_idx]

    return chunks


def merge(
    chunks: List[str],
    max_len: Optional[int] = None,
    encoding_name: str = EMBEDDING_ENCODING,
    separator: Optional[str] = None,
) -> str:
    """
    This function takes a list of `chunks` and optional parameters `max_len`, `encoding_name`, and `separator`.
    It encodes each chunk using the specified tokenizer, checks if the current length exceeds the `max_len`,
    breaks if it does, and appends the chunk to the `context` list.
    Finally, it joins the context list with the specified separator
    (default is '\\n\\n###\\n\\n') and returns the merged string.

    For example,
    ```python
    chunks = ['Hello', 'world', '!']
    merge(chunks, max_len=10)
    ```
    will return
    ```
    'Hello world!'
    """
    tokenizer = get_encoding(encoding_name)

    cur_len = 0
    context = []
    for chunk in chunks:
        n_tokens = len(tokenizer.encode(chunk))
        cur_len += n_tokens + 4
        if max_len is not None and cur_len > max_len:
            break
        context.append(chunk)

    if separator is None:
        separator = "\n\n###\n\n"

    return separator.join(context)
