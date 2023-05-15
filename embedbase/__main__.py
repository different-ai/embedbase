"""
A simple example to try a local and privacy-first embedbase.
"""

from typing import List, Union
import uvicorn
from embedbase import get_app
from embedbase.database.memory_db import MemoryDatabase
from embedbase.embedding.base import Embedder
from sentence_transformers import SentenceTransformer


# pylint: disable=missing-class-docstring
class LocalEmbedder(Embedder):
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"

    def __init__(self, model: str = EMBEDDING_MODEL, **kwargs):
        super().__init__(**kwargs)
        self.model = SentenceTransformer(model)
        self._dimensions = self.model.get_sentence_embedding_dimension()

    @property
    def dimensions(self) -> int:
        """
        Return the dimensions of the embeddings
        :return: dimensions of the embeddings
        """
        return self._dimensions

    def is_too_big(self, text: str) -> bool:
        """
        Check if text is too big to be embedded,
        delegating the splitting UX to the caller
        :param text: text to check
        :return: True if text is too big, False otherwise
        """
        return len(text) > self.model.get_max_seq_length()

    async def embed(self, data: Union[List[str], str]) -> List[List[float]]:
        """
        Embed a list of texts
        :param texts: list of texts
        :return: list of embeddings
        """
        embeddings = self.model.encode(data)
        return embeddings.tolist() if isinstance(data, list) else [embeddings.tolist()]


app = get_app().use_db(MemoryDatabase()).use_embedder(LocalEmbedder()).run()


# pylint: disable=missing-function-docstring
def run_app():
    uvicorn.run(app, host="0.0.0.0")


if __name__ == "__main__":
    run_app()
