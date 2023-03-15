import urllib.parse
from typing import Coroutine, List, Optional

from pandas import DataFrame

from embedbase.db import VectorDatabase


class Pinecone(VectorDatabase):
    def __init__(
        self,
    ):
        """
        pinecone
        """
        raise NotImplementedError(
            "Pinecone is not supported."
            + "If you want to use Pinecone, please"
            + " create an issue "
            + "https://github.com/different-ai/embedbase/issues/new/choose"
        )
