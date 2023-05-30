from typing import List, Optional, Union

from embedbase.database.base import (
    Dataset,
    SearchResponse,
    SelectResponse,
    VectorDatabase,
    WhereResponse,
)
from embedbase.models import Document


# Calculate cosine similarity
def cosine_similarity(np, a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


# Semantic search function
def semantic_search(np, documents, query_embedding, document_embeddings, top_n=3):
    similarities = [
        cosine_similarity(np, query_embedding, doc_emb)
        for doc_emb in document_embeddings
    ]
    sorted_indexes = np.argsort(similarities)[::-1]

    return [
        (i, list(documents.keys())[i], similarities[i]) for i in sorted_indexes[:top_n]
    ]


class MemoryDatabase(VectorDatabase):
    """
    Implements a simple in-memory database for development and testing purposes.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.storage = {}
        try:
            # pylint: disable=import-outside-toplevel
            import numpy as np

            self._np = np
        except ImportError:
            # pylint: disable=raise-missing-from
            raise ImportError("Please install numpy with `pip install numpy`")

    async def update(
        self,
        df,
        dataset_id,
        user_id=None,
        store_data=True,
        batch_size=100,
        where: Optional[Union[dict, List[dict]]] = None,
    ):
        if where:
            raise NotImplementedError(
                "where is not implemented in memory db yet, if you need it, ping us on discord and we will ship instantly"
            )
        for _, row in df.iterrows():
            doc_id = row.id
            self.storage[doc_id] = {
                "data": row.data if store_data else None,
                "embedding": self._np.array(row.embedding),
                "metadata": row.metadata,
                "dataset_id": dataset_id,
                "user_id": user_id,
                "hash": row.hash,
            }

    async def select(
        self,
        ids=[],
        hashes=[],
        dataset_id=None,
        user_id=None,
        # todo: distinct is not implemented
        distinct: bool = True,
    ):
        if ids:
            return [
                SelectResponse(
                    id=doc_id,
                    data=self.storage[doc_id]["data"],
                    embedding=self.storage[doc_id]["embedding"].tolist(),
                    metadata=self.storage[doc_id]["metadata"],
                    hash=self.storage[doc_id]["hash"],
                )
                for doc_id in ids
                if doc_id in self.storage
                and (
                    dataset_id is None
                    or self.storage[doc_id]["dataset_id"] == dataset_id
                )
                and (user_id is None or self.storage[doc_id]["user_id"] == user_id)
            ]
        elif hashes:
            return [
                SelectResponse(
                    id=id,
                    data=doc["data"],
                    embedding=doc["embedding"].tolist(),
                    metadata=doc["metadata"],
                    hash=doc["hash"],
                )
                for id, doc in self.storage.items()
                if doc["hash"] in hashes
                and (dataset_id is None or doc["dataset_id"] == dataset_id)
                and (user_id is None or doc["user_id"] == user_id)
            ]
        else:
            return []

    async def search(self, vector, top_k, dataset_ids, user_id=None, where=None):
        storage = self.storage
        # make a copy of storage filtered by where
        if where:
            # raise if where is not a dict
            if not isinstance(where, dict):
                raise ValueError("currently only dict is supported for where")
            storage = self.storage.copy()
            for k, v in where.items():
                # search in metadata
                storage = {
                    k1: v1
                    for k1, v1 in storage.items()
                    if k in v1["metadata"] and v1["metadata"][k] == v
                }
        query_embedding = self._np.array(vector)
        similarities = semantic_search(
            self._np,
            storage,
            query_embedding,
            [
                doc["embedding"]
                for doc in storage.values()
                if doc["dataset_id"] in dataset_ids
                and (user_id is None or doc["user_id"] == user_id)
            ],
            top_n=top_k,
        )
        return [
            SearchResponse(
                id=doc_id,
                score=sim,
                data=storage[doc_id]["data"],
                metadata=storage[doc_id]["metadata"],
                embedding=storage[doc_id]["embedding"].tolist(),
                hash=storage[doc_id]["hash"],
            )
            for idx, doc_id, sim in similarities
        ]

    async def delete(self, ids, dataset_id, user_id=None):
        for doc_id in ids:
            if (
                doc_id in self.storage
                and (
                    dataset_id is None
                    or self.storage[doc_id]["dataset_id"] == dataset_id
                )
                and (user_id is None or self.storage[doc_id]["user_id"] == user_id)
            ):
                del self.storage[doc_id]

    async def get_datasets(self, user_id=None):
        datasets = {}
        for doc in self.storage.values():
            if user_id is None or doc["user_id"] == user_id:
                dataset_id = doc["dataset_id"]
                if dataset_id not in datasets:
                    datasets[dataset_id] = 1
                else:
                    datasets[dataset_id] += 1
        return [
            Dataset(
                dataset_id=k,
                documents_count=v,
            )
            for k, v in datasets.items()
        ]

    async def clear(self, dataset_id, user_id=None):
        doc_ids_to_remove = [
            doc_id
            for doc_id, doc in self.storage.items()
            if doc["dataset_id"] == dataset_id
            and (user_id is None or doc["user_id"] == user_id)
        ]
        for doc_id in doc_ids_to_remove:
            del self.storage[doc_id]

    async def list(
        self,
        dataset_id: str,
        user_id: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[Document]:
        raise NotImplementedError

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
