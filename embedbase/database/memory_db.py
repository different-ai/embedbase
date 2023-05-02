from embedbase.database.base import VectorDatabase


class MemoryDatabase(VectorDatabase):
    """
    Implements a simple in-memory database for development and testing purposes.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.storage = {}
        try:
            import numpy as np

            self._np = np
        except ImportError:
            raise ImportError("Please install numpy with `pip install numpy`")

    async def update(
        self, df, dataset_id, user_id=None, store_data=True, batch_size=100
    ):
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
                {
                    "id": doc_id,
                    "data": self.storage[doc_id]["data"],
                    "embedding": self.storage[doc_id]["embedding"].tolist(),
                    "metadata": self.storage[doc_id]["metadata"],
                    "hash": self.storage[doc_id]["hash"],
                }
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
                {
                    "id": id,
                    "data": doc["data"],
                    "embedding": doc["embedding"].tolist(),
                    "metadata": doc["metadata"],
                    "hash": doc["hash"],
                }
                for id, doc in self.storage.items()
                if doc["hash"] in hashes
                and (dataset_id is None or doc["dataset_id"] == dataset_id)
                and (user_id is None or doc["user_id"] == user_id)
            ]
        else:
            return []

    async def search(self, vector, top_k, dataset_ids, user_id=None):
        query_embedding = self._np.array(vector)
        similarities = [
            (
                doc_id,
                self._np.dot(doc["embedding"], query_embedding)
                / (
                    self._np.linalg.norm(doc["embedding"])
                    * self._np.linalg.norm(query_embedding)
                ),
            )
            for doc_id, doc in self.storage.items()
            if doc["dataset_id"] in dataset_ids
            and (user_id is None or doc["user_id"] == user_id)
        ]
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [
            {
                "id": doc_id,
                "score": sim,
                "data": self.storage[doc_id]["data"],
                "metadata": self.storage[doc_id]["metadata"],
                "embedding": self.storage[doc_id]["embedding"].tolist(),
                "hash": self.storage[doc_id]["hash"],
            }
            for doc_id, sim in similarities[:top_k]
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
        return [{"dataset_id": k, "documents_count": v} for k, v in datasets.items()]

    async def clear(self, dataset_id, user_id=None):
        doc_ids_to_remove = [
            doc_id
            for doc_id, doc in self.storage.items()
            if doc["dataset_id"] == dataset_id
            and (user_id is None or doc["user_id"] == user_id)
        ]
        for doc_id in doc_ids_to_remove:
            del self.storage[doc_id]
