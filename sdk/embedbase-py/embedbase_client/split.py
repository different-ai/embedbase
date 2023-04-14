from tiktoken import get_encoding
from typing import Callable, List, Optional, Tuple, Union

MAX_CHUNK_LENGTH = 8191
EMBEDDING_ENCODING = 'cl100k_base'
CHUNK_OVERLAP = 0


class SplitTextChunk:
    def __init__(self, chunk: str, start: int, end: int):
        self.chunk = chunk
        self.start = start
        self.end = end

    def __repr__(self):
        return f"SplitTextChunk(chunk='{self.chunk}', start={self.start}, end={self.end})"


def split_text(
    text: str,
    max_tokens: int = MAX_CHUNK_LENGTH,
    chunk_overlap: int = CHUNK_OVERLAP,
    encoding_name: str = EMBEDDING_ENCODING,
    callback: Optional[Callable[[SplitTextChunk], None]] = None
) -> List[SplitTextChunk]:
    if chunk_overlap >= max_tokens:
        raise ValueError('Cannot have chunkOverlap >= chunkSize')

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
        if callback:
            callback(chunk_item)
        start_idx += chunk_size - chunk_overlap
        cur_idx = min(start_idx + chunk_size, len(input_ids))
        chunk_ids = input_ids[start_idx:cur_idx]

    return chunks
