import asyncio
from typing import Coroutine, List, Optional
from pandas import DataFrame
from embedbase.db import VectorDatabase
from embedbase.utils import BatchGenerator


class Supabase(VectorDatabase):
    def __init__(
        self,
        url: str,
        key: str,
    ):
        """
        :param url: supabase url
        :param key: supabase key
        """
        try:
            from supabase import create_client, Client

            self.supabase: Client = create_client(url, key)
            self.functions = self.supabase.functions()

        except ImportError:
            raise ImportError("Please install supabase with `pip install supabase`")

    async def fetch(
        self, ids: List[str], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param ids: list of ids
        :return: list of vectors
        """
        return (
            self.supabase.table("documents")
            .select("*")
            .eq("namespace", namespace)
            .in_("id", ids)
            .execute()
            .data
        )

    async def fetch_by_hash(
        self, hashes: List[str], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param hashes: list of hashes
        :param namespace: namespace
        :return: list of vectors
        """
        return (
            self.supabase.table("documents")
            .select("*")
            .eq("namespace", namespace)
            .in_("hash", hashes)
            .execute()
            .data
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
        :param save_clear_data: save clear data
        """
        df_batcher = BatchGenerator(batch_size)
        batches = [batch_df for batch_df in df_batcher(df)]

        async def _insert(batch_df: DataFrame):
            def _d(row):
                return (
                    {
                        "id": row.id,
                        "data": row.data,
                        "embedding": row.embedding,
                        "hash": row.hash,
                        "namespace": namespace,
                    }
                    if save_clear_data
                    else {
                        "id": row.id,
                        "embedding": row.embedding,
                        "hash": row.hash,
                        "namespace": namespace,
                    }
                )

            response = (
                self.supabase.table("documents")
                .upsert([_d(row) for _, row in batch_df.iterrows()])
                .execute()
            )
            return response

        # TODO: not sure truly parallel, python garbage
        results = await asyncio.gather(*[_insert(batch_df) for batch_df in batches])
        return results

    async def delete(self, ids: List[str], namespace: Optional[str] = None) -> None:
        """
        :param ids: list of ids
        """
        return (
            self.supabase.table("documents")
            .delete()
            .eq("namespace", namespace)
            .in_("id", ids)  # TODO test
            .execute()
        )

    async def search(
        self, vector: List[float], top_k: Optional[int], namespace: Optional[str] = None
    ) -> List[dict]:
        """
        :param vector: vector
        :param top_k: top k
        :param namespace: namespace
        :return: list of vectors
        """
        return (
            self.supabase.rpc(
                "match_documents",
                {
                    "query_embedding": vector,
                    "similarity_threshold": 0.1,  # TODO: make this configurable
                    "match_count": top_k,
                    "query_namespace": namespace,
                },
            )
            .execute()
            .data
        )

    async def clear(self, namespace: Optional[str]) -> None:
        """
        :param namespace: namespace
        """
        # TODO: will crash if no namespace?
        return (
            self.supabase.table("documents")
            .delete()
            .eq("namespace", namespace)
            .execute()
        )
