from typing import List, Optional, Union

import ast
import asyncio
import itertools

import pandas as pd
from pandas import DataFrame, Series

from embedbase.database import VectorDatabase
from embedbase.database.base import (
    Dataset,
    SearchResponse,
    SelectResponse,
    WhereResponse,
)
from embedbase.models import Document
from embedbase.utils import BatchGenerator


class Supabase(VectorDatabase):
    """
    Implements a vector database using supabase
    Supabase is an open source Firebase alternative.
    """

    def __init__(self, url: str, key: str, **kwargs):
        """
        :param url: supabase url
        :param key: supabase key
        """
        super().__init__(**kwargs)
        try:
            from supabase import Client, create_client

            self.supabase: Client = create_client(url, key)
            self.functions = self.supabase.functions()

        except ImportError:
            raise ImportError("Please install supabase with `pip install supabase`")

    async def select(
        self,
        ids: List[str] = [],
        hashes: List[str] = [],
        dataset_id: Optional[str] = None,
        user_id: Optional[str] = None,
        distinct: bool = True,
    ):
        # either ids or hashes must be provided
        assert ids or hashes, "ids or hashes must be provided"

        # raise if both ids and hashes are provided
        assert not (
            ids and hashes
        ), "ids and hashes cannot be provided at the same time"
        # TODO not supported yet

        async def _fetch(ids, hashes) -> List[dict]:
            try:
                req = self.supabase.table("documents").select("*")
                if ids:
                    req = req.in_("id", ids)
                    if distinct:
                        # hack: supabase does not support distinct
                        req = req.order("id", desc=True)
                        req = req.limit(len(ids))
                if hashes:
                    req = req.in_("hash", hashes)
                    if distinct:
                        # hack: supabase does not support distinct
                        req = req.order("hash", desc=True)
                        req = req.limit(len(hashes))
                if dataset_id:
                    req = req.eq("dataset_id", dataset_id)
                if user_id:
                    req = req.eq("user_id", user_id)

                return req.execute().data
            except Exception as e:
                raise e

        # we need to run parallel requests with supabase
        n = 50
        docs = []
        if ids:
            elements = [ids[i : i + n] for i in range(0, len(ids), n)]
            docs = await asyncio.gather(*[_fetch(e, []) for e in elements])
        else:
            elements = [hashes[i : i + n] for i in range(0, len(hashes), n)]
            docs = await asyncio.gather(*[_fetch([], e) for e in elements])
        return [
            SelectResponse(
                id=row["id"],
                data=row["data"],
                embedding=ast.literal_eval(row["embedding"]),
                hash=row["hash"],
                metadata=row["metadata"],
            )
            for row in itertools.chain.from_iterable(docs)
        ]

    async def update(
        self,
        df: DataFrame,
        dataset_id: str,
        user_id: Optional[str] = None,
        batch_size: Optional[int] = 100,
        store_data: bool = True,
    ):
        df_batcher = BatchGenerator(batch_size)
        batches = [batch_df for batch_df in df_batcher(df)]

        # create dataset in datasets table if not exist

        q = self.supabase.table("datasets").select("*").eq("name", dataset_id)
        if user_id:
            q = q.eq("owner", user_id)
        data = q.execute().data
        if not data:
            self.supabase.table("datasets").insert(
                {
                    "name": dataset_id,
                    "owner": user_id,
                }
            ).execute()

        async def _insert(batch_df: DataFrame):
            def _d(row: Series):
                data = {
                    "id": row.id,
                    "embedding": row.embedding,
                    "hash": row.hash,
                    "dataset_id": dataset_id,
                    "user_id": user_id,
                    "metadata": row.metadata,
                }
                # {'code': '22P05', 'details': '\\u0000 cannot be converted to text.', 'hint': None, 'message': 'unsupported Unicode escape sequence'}
                row.data = row.data.replace("\x00", "")
                if store_data:
                    data["data"] = row.data
                return data

            (
                self.supabase.table("documents")
                .upsert([_d(row) for _, row in batch_df.iterrows()])
                .execute()
            )

        await asyncio.gather(*[_insert(batch_df) for batch_df in batches])

    async def delete(
        self,
        ids: List[str],
        dataset_id: str,
        user_id: Optional[str] = None,
    ):
        req = self.supabase.table("documents").delete().eq("dataset_id", dataset_id)
        if user_id:
            req = req.eq("user_id", user_id)
        req.in_("id", ids).execute()

    async def search(
        self,
        vector: List[float],
        top_k: Optional[int],
        dataset_ids: List[str],
        user_id: Optional[str] = None,
        where=None,
    ):
        d = {
            "query_embedding": vector,
            "similarity_threshold": 0.1,  # TODO: make this configurable
            "match_count": top_k,
            "query_dataset_ids": dataset_ids,
        }
        if user_id:
            d["query_user_id"] = user_id
        query = self.supabase.rpc(
            "match_documents",
            d,
        )

        if where:
            # raise if where is not a dict
            if not isinstance(where, dict):
                raise ValueError("currently only dict is supported for where")
            metadata_field = list(where.keys())[0]
            metadata_value = where[metadata_field]
            d["metadata_field"] = metadata_field
            d["metadata_value"] = metadata_value
        response = query.execute().data
        return [
            SearchResponse(
                id=row["id"],
                data=row["data"],
                embedding=ast.literal_eval(row["embedding"]),
                hash=row["hash"],
                metadata=row["metadata"],
                score=row["score"],
            )
            for row in response
        ]

    async def clear(self, dataset_id: str, user_id: Optional[str] = None):
        req = self.supabase.table("documents").delete().eq("dataset_id", dataset_id)
        if user_id:
            req = req.eq("user_id", user_id)
        req.execute()

    async def get_datasets(self, user_id: Optional[str] = None):
        req = self.supabase.table("datasets").select(
            "name", "documents_count", "created_at"
        )
        if user_id:
            req = req.eq("owner", user_id)
        data = req.execute().data
        return [
            Dataset(
                dataset_id=row["name"],
                documents_count=row["documents_count"],
                created_at=row["created_at"],
            )
            for row in data
        ]

    async def list(
        self,
        dataset_id: str,
        user_id: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[Document]:
        req = self.supabase.table("documents").select("*").eq("dataset_id", dataset_id)
        if user_id:
            req = req.eq("user_id", user_id)
        req = req.range(offset, offset + limit)
        data = req.execute().data
        return [
            Document(
                id=row["id"],
                data=row["data"],
                embedding=ast.literal_eval(row["embedding"]),
                hash=row["hash"],
                metadata=row["metadata"],
                dataset_ids=[row["dataset_id"]],
            )
            for row in data
        ]

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
        q = self.supabase.table("documents").select("*")
        # update only for this user id and dataset id if given
        if user_id:
            q = q.eq("user_id", user_id)
        if dataset_id:
            q = q.eq("dataset_id", dataset_id)
        metadata_keys = list(where.keys())
        metadata_values = list(where.values())
        for key, value in zip(metadata_keys, metadata_values):
            q = q.eq(f"metadata->>{key}", value)

        docs = q.execute().data
        return [
            WhereResponse(
                id=row["id"],
                data=row["data"],
                embedding=ast.literal_eval(row["embedding"]),
                hash=row["hash"],
                metadata=row["metadata"],
                dataset_ids=[row["dataset_id"]],
            )
            for row in docs
        ]
