from typing import List, Optional, Union

import asyncio
import itertools
import json

from pandas import DataFrame, Series

from embedbase.database import VectorDatabase
from embedbase.database.base import (
    Dataset,
    SearchResponse,
    SelectResponse,
    WhereResponse,
)
from embedbase.models import Document


class Postgres(VectorDatabase):
    def __init__(
        self, conn_str="postgresql://postgres:localdb@0.0.0.0/embedbase", **kwargs
    ):
        """
        Implements a vector database using postgres
        """
        super().__init__(**kwargs)
        try:
            import psycopg
            from pgvector.psycopg import register_vector

            self.conn = psycopg.connect(conn_str, dbname="embedbase")
            self.conn.autocommit = True
            self.conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            register_vector(self.conn)
            self.conn.execute(
                f"""
create table documents (
    id text primary key,
    data text,
    embedding vector ({self._dimensions}),
    hash text,
    dataset_id text,
    user_id text,
    metadata json,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"""
            )
            self.conn.execute(
                """
create index on documents
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
"""
            )
            self.conn.execute(
                f"""
create or replace function match_documents (
  query_embedding vector({self._dimensions}),
  similarity_threshold float,
  match_count int,
  query_dataset_ids text[],
  query_user_id text default null,
  metadata_field text default null,
  metadata_value text default null
)
returns table (
  id text,
  data text,
  score float,
  hash text,
  embedding vector({self._dimensions}),
  metadata json
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.data,
    (1 - (documents.embedding <=> query_embedding)) as similarity,
    documents.hash,
    documents.embedding,
    documents.metadata
  from documents
  where 1 - (documents.embedding <=> query_embedding) > similarity_threshold
    and documents.dataset_id = any(query_dataset_ids)
    and (query_user_id is null or query_user_id = documents.user_id)
    and (metadata_field is null or documents.metadata->>metadata_field = metadata_value) -- filter by metadata
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;"""
            )
            self.conn.execute( # TODO. make this deprecated and use new api - see supabase_db
                """
CREATE OR REPLACE VIEW distinct_datasets AS
SELECT dataset_id, user_id, COUNT(*) AS documents_count
FROM documents
GROUP BY dataset_id, user_id;
"""
            )

        except ImportError:
            # pylint: disable=raise-missing-from
            raise ImportError(
                "Please install pgvector and psycopg with `pip install pgvector psycopg[binary]`"
            )
        except psycopg.OperationalError:
            # pylint: disable=raise-missing-from
            raise psycopg.OperationalError(
                "Please run a postgresql and create a database named embedbase"
            )
        except Exception as e:
            print(e)

    async def select(
        self,
        ids: List[str] = [],
        hashes: List[str] = [],
        dataset_id: Optional[str] = None,
        user_id: Optional[str] = None,
        # todo: distinct is not implemented
        distinct: bool = True,
    ):
        # either ids or hashes must be provided
        assert ids or hashes, "ids or hashes must be provided"
        from psycopg import sql

        query = """
select id, data, embedding, hash, metadata
from documents
where
    {conditions}
"""

        async def _fetch(ids, hashes) -> List[dict]:
            try:
                conditions = []
                if ids:
                    conditions.append(
                        sql.SQL("id in ({})").format(
                            sql.SQL(",").join(map(sql.Literal, ids))
                        )
                    )
                if hashes:
                    conditions.append(
                        sql.SQL("hash in ({})").format(
                            sql.SQL(",").join(map(sql.Literal, hashes))
                        )
                    )
                if dataset_id:
                    conditions.append(
                        sql.SQL("dataset_id = {}").format(sql.Literal(dataset_id))
                    )
                if user_id:
                    conditions.append(
                        sql.SQL("user_id = {}").format(sql.Literal(user_id))
                    )
                return list(
                    self.conn.execute(
                        sql.SQL(query).format(
                            conditions=sql.SQL(" and ").join(conditions)
                        )
                    )
                )
            except Exception as e:
                raise e

        # we need to run parallel requests with postgres
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
                id=row[0],
                data=row[1],
                embedding=row[2].tolist(),
                hash=row[3],
                metadata=row[4],
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
        where: Optional[Union[dict, List[dict]]] = None,
    ):
        if where:
            raise NotImplementedError(
                "where is not implemented in postgres db yet, if you need it, ping us on discord and we will ship instantly"
            )

        if len(df) == 0:
            return

        def _d(row: Series):
            data = [
                row.id,
                row.data if store_data else None,
                row.embedding,
                row.hash,
                dataset_id,
                user_id,
                json.dumps(row.metadata),
            ]
            # {'code': '22P05', 'details': '\\u0000 cannot be converted to text.', 'hint': None, 'message': 'unsupported Unicode escape sequence'}
            row.data = row.data.replace("\x00", "")
            return data

        values = [tuple(_d(row)) for _, row in df.iterrows()]
        num_columns = len(values[0])
        placeholders = ", ".join(
            ["(" + ", ".join(["%s"] * num_columns) + ")"] * len(values)
        )
        flat_values = [item for sublist in values for item in sublist]
        q = f"""
            INSERT INTO documents(id, data, embedding, hash, dataset_id, user_id, metadata)
            VALUES {placeholders}
            ON CONFLICT (id) DO UPDATE SET
                data = excluded.data,
                embedding = excluded.embedding,
                hash = excluded.hash,
                dataset_id = excluded.dataset_id,
                user_id = excluded.user_id,
                metadata = excluded.metadata
        """

        with self.conn.cursor() as cur:
            cur.execute(q, flat_values)

    async def delete(
        self,
        ids: List[str],
        dataset_id: str,
        user_id: Optional[str] = None,
    ):
        req = "delete from documents where id in %s and dataset_id = %s", (
            tuple(ids),
            dataset_id,
        )
        if user_id:
            req += f" and user_id = {user_id}"
        [dict(row) for row in self.conn.execute(req)]

    async def search(
        self,
        vector: List[float],
        top_k: Optional[int],
        dataset_ids: List[str],
        user_id: Optional[str] = None,
        where=None,
    ):
        d = {
            "query_embedding": str(vector),
            "similarity_threshold": 0.0,  # TODO: make this configurable
            "match_count": top_k,
            "query_dataset_ids": dataset_ids,
        }
        q = "select * from match_documents(%(query_embedding)s, %(similarity_threshold)s, %(match_count)s, %(query_dataset_ids)s"
        if user_id:
            d["query_user_id"] = user_id
            q += ", %(query_user_id)s"
        if where:
            raise NotImplementedError(
                "where is not implemented in postgres db yet, if you need it, ping us on discord and we will ship instantly"
            )

            # raise if where is not a dict
            if not isinstance(where, dict):
                raise ValueError("currently only dict is supported for where")
            metadata_field = list(where.keys())[0]
            metadata_value = where[metadata_field]
            d["metadata_field"] = metadata_field
            d["metadata_value"] = metadata_value
            q += ", %(metadata_field)s, %(metadata_value)s"
        q += ")"
        results = self.conn.execute(q, d)
        if results.rowcount == 0:
            return []
        data = []
        for row in results:
            data.append(
                SearchResponse(
                    id=row[0],
                    data=row[1],
                    score=row[2],
                    hash=row[3],
                    embedding=row[4].tolist(),
                    metadata=row[5],
                )
            )
        return data

    async def clear(self, dataset_id: str, user_id: Optional[str] = None):
        req = f"delete from documents where dataset_id = '{dataset_id}'"
        if user_id:
            req += f" and user_id = {user_id}"
        self.conn.execute(req)

    async def get_datasets(self, user_id: Optional[str] = None):
        req = "select * from distinct_datasets"
        if user_id:
            req += f" where user_id = '{user_id}'"
        results = self.conn.execute(req)
        if results.rowcount == 0:
            return []
        data = []
        for row in results:
            data.append(
                Dataset(
                    dataset_id=row[0],
                    documents_count=row[2],
                )
            )
        return data

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
