import urllib.parse
from typing import Coroutine, List, Optional

from pandas import DataFrame

from embedbase.db import VectorDatabase
from embedbase.utils import BatchGenerator, too_big_rows


class Pinecone(VectorDatabase):
    def __init__(
        self,
        api_key: str,
        environment: str,
        index_name: str,
        default_namespace: Optional[str] = None,
    ):
        """
        :param api_key: api key
        :param pinecone_environment: pinecone environment
        """
        try:
            import pinecone

            pinecone.init(
                api_key=api_key,
                pinecone_environment=environment,
            )
            self.index = pinecone.Index(index_name, pool_threads=8)
            self.default_namespace = default_namespace
        except ImportError:
            raise ImportError("Please install pinecone with `pip install pinecone`")

    async def fetch(
        self, ids: List[str], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param ids: list of ids
        :return: list of vectors
        """
        return list(
            self.index.fetch(
                ids, namespace=namespace or self.default_namespace
            ).vectors.values()
        )

    async def fetch_by_hash(
        self, hashes: List[str], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param hashes: list of hashes
        :param namespace: namespace
        :return: list of vectors
        """
        raise NotImplementedError("Pinecone does not support this operation")
        # TODO: check the limit of number of hashes for metadata filter
        return self.index.query(
            vector=[0] * 1536,
            filter={
                "hash": {"$in": hashes},
            },
            top_k=len(hashes),
            include_metadata=True,
            include_values=True,
            namespace=namespace or self.default_namespace,
        )

    async def update(
        self,
        df: DataFrame,
        namespace: Optional[str] = None,
        batch_size: Optional[int] = 100,
        save_clear_data: bool = True,
    ) -> Coroutine:
        """
        :param vectors: list of vectors
        :param namespace: namespace
        :param batch_size: batch size
        :param save_clear_data: save clear data
        """
        df_batcher = BatchGenerator(batch_size)
        batches = [batch_df for batch_df in df_batcher(df)]

        def _insert(batch_df: DataFrame):
            bigs = too_big_rows(batch_df)
            # remove rows that are too big, in the right axis
            batch_df = batch_df.drop(bigs, axis=0)
            response = self.index.upsert(
                vectors=zip(
                    # pinecone needs to have the document path url encoded
                    batch_df.id.apply(urllib.parse.quote).tolist(),
                    batch_df.embedding,
                    [
                        {
                            "data": data,
                            "hash": hash,
                        }
                        for data, hash in zip(
                            batch_df.data,
                            batch_df.hash,
                        )
                    ],
                )
                if save_clear_data
                else zip(
                    batch_df.id.apply(urllib.parse.quote).tolist(),
                    batch_df.embedding,
                    [
                        {
                            "hash": hash,
                        }
                        for hash in batch_df.hash
                    ],
                ),
                namespace=namespace or self.default_namespace,
                async_req=True,
            )
            return response

        [response.get() for response in map(_insert, batches)]

    async def delete(self, ids: List[str], namespace: Optional[str] = None) -> None:
        """
        :param ids: list of ids
        """
        self.index.delete(ids, namespace=namespace or self.default_namespace)

    async def search(
        self, vector: List[float], top_k: Optional[int], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param vector: vector
        :param top_k: top k
        :param namespace: namespace
        :return: list of vectors
        """
        matches = self.index.query(
            vector,
            top_k=top_k,
            namespace=namespace or self.default_namespace,
            include_values=True,
            include_metadata=True,
        ).matches
        return [
            {
                "id": m.id,
                "data": m.get("metadata", {}).get("data", ""),
                "score": m.score,
                "hash": m.get("metadata", {}).get("hash", ""),
                "embedding": m.values,
            }
            for m in matches
        ]

    async def clear(self, namespace: Optional[str]) -> None:
        """
        :param namespace: namespace
        """
        self.index.delete(
            delete_all=True, namespace=namespace or self.default_namespace
        )
