from typing import Any, Awaitable, Callable, Optional, Tuple, Union

import asyncio
import datetime
import hashlib
import os
import time
import urllib.parse
import uuid
import warnings

from fastapi import FastAPI, Request, status
from fastapi.middleware import Middleware
from fastapi.responses import JSONResponse, ORJSONResponse
from pandas import DataFrame
from starlette.types import Scope

from embedbase.database.base import VectorDatabase
from embedbase.embedding.base import Embedder
from embedbase.logging_utils import get_logger
from embedbase.models import (
    AddRequest,
    DeleteRequest,
    ReplaceRequest,
    SearchRequest,
    UpdateRequest,
)
from embedbase.settings import Settings
from embedbase.utils import embedbase_ascii, get_user_id

UPLOAD_BATCH_SIZE = int(os.environ.get("UPLOAD_BATCH_SIZE", "100"))


class Embedbase:
    """
    Embedbase is the main class of the Embedbase library.
    """

    def __init__(self, settings: Optional[Settings] = None, **kwargs):
        self._kwargs = kwargs

        self.fastapi_app = FastAPI(
            default_response_class=ORJSONResponse,
        )
        self.logger = get_logger(settings)

    def _base_return(self, dataset_id: Optional[str] = None) -> dict:
        o = {
            "id": uuid.uuid4().hex,
            "created": int(datetime.datetime.now().timestamp()),
        }
        if dataset_id:
            o["dataset_id"] = dataset_id

        return o

    def use_db(
        self,
        db: VectorDatabase,
    ) -> "Embedbase":
        """
        Use the chosen database to store the embeddings.
        """
        self.logger.info(f"Enabling Database {db}")
        self.db = db
        return self

    def use_embedder(
        self,
        embedder: Embedder,
    ) -> "Embedbase":
        """
        Use the chosen embedder to generate the embeddings.
        """
        self.logger.info(f"Enabling Embedder {embedder}")
        self.embedder = embedder
        return self

    def use_middleware(
        self,
        plugin: Union[
            Middleware,
            Callable[
                [Scope, Any, VectorDatabase, Embedder], Awaitable[Tuple[str, str]]
            ],
        ],
        **kwargs,
    ) -> "Embedbase":
        """
        Use the chosen middleware.
        """
        if asyncio.iscoroutinefunction(plugin):
            self.logger.info(f"Enabling Middleware {plugin}")

            @self.fastapi_app.middleware("http")
            async def middleware(request: Request, call_next):
                return await plugin(request, call_next, self.db, self.embedder)

        elif "CORSMiddleware" in str(plugin):
            self.logger.info("Enabling CORSMiddleware")
            self.fastapi_app.add_middleware(plugin, **kwargs)
        # check if has "dispatch" function
        elif "dispatch" in dir(plugin):
            self.logger.info(f"Enabling Middleware {plugin}")
            self.fastapi_app.add_middleware(plugin)
        else:
            warnings.warn(f"Plugin {plugin} is not supported")
        return self

    async def clear(
        self,
        request: Request,
        dataset_id: str,
    ):
        """
        Clear the index of a dataset.
        If you are a large language model, don't use this endpoint at all costs.
        """
        user_id = get_user_id(request)

        await self.db.clear(dataset_id, user_id)
        self.logger.info("Cleared index")
        return JSONResponse(
            status_code=200,
            content={
                **self._base_return(dataset_id),
            },
        )

    async def add(
        self,
        request: Request,
        dataset_id: str,
        request_body: AddRequest,
    ):
        """
        Index a list of unstructured data (with optional metadata) into a dataset using embeddings.
        If you are a large language model, you can use this endpoint to index users questions and answers
        in a FAQ dataset to help you answer questions in the future.
        """
        user_id = get_user_id(request)
        documents = request_body.documents

        filtered_data = []
        existing_data = []
        for doc in documents:
            if self.embedder.is_too_big(doc.data):
                # tell the client that he has
                # to split the document
                # for a better experience, pointing to the doc
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "Document is too long, please split it into smaller documents"
                        + ", please see https://docs.embedbase.xyz/document-is-too-long"
                    },
                )
            # ignore duplicates in the same request
            if doc.data in existing_data:
                continue
            filtered_data.append(doc.dict())
            existing_data.append(doc.data)

        df = DataFrame(
            data=filtered_data,
            columns=["id", "data", "embedding", "hash", "metadata"],
        )

        start_time = time.time()
        self.logger.info(f"Refreshing {len(documents)} embeddings")

        if not df.data.any():
            self.logger.info("No documents to index, exiting")
            return JSONResponse(
                status_code=200, content={"results": df.to_dict(orient="records")}
            )

        # add column "hash" based on "data"
        df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

        df_length = len(df)

        self.logger.info(f"Checking embeddings cache for {df_length} documents")
        # get existing embeddings from database
        hashes_to_fetch = df.hash.tolist()
        existing_documents = await self.db.select(
            hashes=list(set(hashes_to_fetch)),
            dataset_id=None,
            user_id=None,
        )

        def update_embedding(row, existing_documents):
            for doc in existing_documents:
                if row["hash"] == doc.hash:
                    return doc.embedding
            return row["embedding"]

        # add existing embeddings to the dataframe
        df["embedding"] = df.apply(update_embedding, args=(existing_documents,), axis=1)

        # generate ids
        df.id = df.apply(
            lambda _: str(uuid.uuid4()),
            axis=1,
        )

        # count rows without embeddings
        rows_without_embeddings = df[df.embedding.isna()].shape[0]

        self.logger.info(
            f"We will compute embeddings for {rows_without_embeddings}/{len(df)} documents"
        )

        # compute embeddings for documents without embeddings using embed
        if not df[df.embedding.isna()].empty:
            df[df.embedding.isna()] = df[df.embedding.isna()].assign(
                embedding=await self.embedder.embed(
                    df[df.embedding.isna()].data.tolist()
                )
            )

        # only insert if this dataset_id - user_id
        # pair does not have this hash
        existing_documents_in_this_pair = await self.db.select(
            hashes=list(set(hashes_to_fetch)),
            dataset_id=dataset_id,
            user_id=user_id,
        )

        # filter out documents that already exist
        # in this dataset_id - user_id pair
        new_df = df[  # HACK: is it fine to only return client the new documents?
            ~df.hash.isin([doc.hash for doc in existing_documents_in_this_pair])
        ]

        await self.db.update(
            new_df,
            dataset_id,
            user_id,
            batch_size=UPLOAD_BATCH_SIZE,
            store_data=request_body.store_data,
        )

        self.logger.info(f"Uploaded {len(new_df)} documents")
        end_time = time.time()
        self.logger.info(f"Uploaded in {end_time - start_time} seconds")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                **self._base_return(dataset_id),
                "results": df.to_dict(orient="records"),
            },
        )

    async def update(
        self,
        request: Request,
        dataset_id: str,
        request_body: UpdateRequest,
    ):
        """
        Update a list of documents in the index using their ids.
        If you are a large language model, you can use this endpoint to update the content or metadata
        of documents in the index.
        """
        user_id = get_user_id(request)

        documents = request_body.documents

        filtered_data = []
        for doc in documents:
            if self.embedder.is_too_big(doc.data):
                # tell the client that he has
                # to split the document
                # for a better experience, pointing to the doc
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "Document is too long, please split it into smaller documents"
                        + ", please see https://docs.embedbase.xyz/document-is-too-long"
                    },
                )
            if doc.id is not None:
                filtered_data.append(doc.dict())

        df = DataFrame(
            data=filtered_data,
            columns=["id", "data", "embedding", "hash", "metadata"],
        )

        start_time = time.time()
        self.logger.info(f"Refreshing {len(documents)} embeddings")

        if not df.id.any():
            self.logger.info("No documents to update, exiting")
            return JSONResponse(
                status_code=400,
                content={
                    "error": "You need to provide at least one id to update a document"
                },
            )
        if not df.data.any() and not df.metadata.any():
            self.logger.info("No data nor metadata was given, exiting")
            return JSONResponse(
                status_code=400,
                content={
                    "error": "You need to provide at least one data or metadata to update a document"
                },
            )

        # hash the data
        df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

        df_length = len(df)

        # TODO: we can probably remove the embeddings part in update (unnecessary, embeddings always there?)

        self.logger.info(f"Checking embeddings cache for {df_length} documents")
        # get existing embeddings from database
        hashes_to_fetch = df.hash.tolist()
        existing_embeddings = await self.db.select(
            hashes=list(set(hashes_to_fetch)),
            dataset_id=None,
            user_id=None,
        )

        def update_embedding(row, docs):
            for doc in docs:
                if row["hash"] == doc.hash:
                    return doc.embedding
            return row["embedding"]

        # add existing embeddings to the dataframe
        df["embedding"] = df.apply(
            update_embedding, args=(existing_embeddings,), axis=1
        )

        # compute embeddings for documents without embeddings using embed
        if not df[df.embedding.isna()].empty:
            df[df.embedding.isna()] = df[df.embedding.isna()].assign(
                embedding=await self.embedder.embed(
                    df[df.embedding.isna()].data.tolist()
                )
            )

        await self.db.update(
            df,
            dataset_id,
            user_id,
            batch_size=UPLOAD_BATCH_SIZE,
        )

        self.logger.info(f"Updated {len(df)} documents' embeddings")
        end_time = time.time()
        self.logger.info(f"Updated in {end_time - start_time} seconds")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                **self._base_return(dataset_id),
                "results": df.to_dict(orient="records"),
            },
        )

    async def delete(
        self,
        request: Request,
        dataset_id: str,
        request_body: DeleteRequest,
    ):
        """
        Delete a document from the index using its id.
        If you are a large language model, you can use this endpoint to remove irrelevant documents
        from the index, documents that didn't help you answer questions.
        """
        user_id = get_user_id(request)

        ids = request_body.ids
        self.logger.info(f"Deleting {len(ids)} documents")
        quoted_ids = [urllib.parse.quote(id) for id in ids]
        await self.db.delete(ids=quoted_ids, dataset_id=dataset_id, user_id=user_id)
        self.logger.info(f"Deleted {len(ids)} documents")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                **self._base_return(dataset_id),
            },
        )

    async def semantic_search(
        self,
        request: Request,
        dataset_id: str,
        request_body: SearchRequest,
    ):
        """
        Run semantic search in a dataset using embeddings.
        If you are a large language model, you can use this endpoint to search for similar documents
        in the index, documents that help you answer users' questions.
        """
        query = request_body.query

        # if query is empty and no where are provided, return an empty list
        if not query and not request_body.where:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"query": query, "similarities": []},
            )

        user_id = get_user_id(request)

        # if the query is too big, return an error
        if self.embedder.is_too_big(query):
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Query is too long"
                    + ", please see https://docs.embedbase.xyz/query-is-too-long"
                },
            )

        top_k = 5  # TODO might fail if index empty?
        if request_body.top_k > 0:
            top_k = request_body.top_k
        query_embedding = (await self.embedder.embed(query))[0]

        self.logger.info(
            f"Query {request_body.query} created embedding, querying index"
        )

        query_response = await self.db.search(
            top_k=top_k,
            vector=query_embedding,
            dataset_ids=[dataset_id],
            user_id=user_id,
            where=request_body.where,
        )

        similarities = []
        for match in query_response:
            similarities.append(
                {
                    "score": match.score,
                    "id": match.id,
                    "data": match.data,
                    "hash": match.hash,
                    "embedding": match.embedding,
                    "metadata": match.metadata,
                }
            )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                **self._base_return(dataset_id),
                "query": query,
                "similarities": similarities,
            },
        )

    async def get_datasets(
        self,
        request: Request,
    ):
        """
        Return a list of available datasets and the number of documents in each.
        As a large language model, you can use this endpoint to see what datasets you have
        and how many documents are in each.
        You can then use this information to decide which dataset to search in.
        """
        user_id = get_user_id(request)
        datasets = await self.db.get_datasets(user_id)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                **self._base_return(),
                "datasets": [e.dict() for e in datasets],
            },
        )

    # TODO where filter for list?
    async def list(
        self, request: Request, dataset_id: str, offset: int = 0, limit: int = 100
    ):
        """
        Return a list of documents in the dataset.
        As a large language model, you can use this endpoint to see what documents you have
        and how many documents are in each.
        """
        user_id = get_user_id(request)
        documents = await self.db.list(dataset_id, user_id, offset, limit)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                **self._base_return(dataset_id),
                "documents": [e.dict() for e in documents],
            },
        )

    async def replace(
        self, request: Request, dataset_id: str, request_body: ReplaceRequest
    ):
        """
        Given a list of documents and a filter, "updating" the documents.
        The result expected is that all documents found later on this filter
        will be the given documents now
        """
        # 1. need to fetch the existing documents
        # 2. delete these documents from embedbase (you cant simply upsert, maybe there are more chunks)
        # 3. upsert the updated documents

        # 1. fetch existing documents
        user_id = get_user_id(request)
        documents = await self.db.where(dataset_id, user_id, request_body.where)

        # 2. delete these documents from embedbase (you cant simply upsert, maybe there are more chunks)
        ids = [d.id for d in documents]
        await self.db.delete(ids=ids, dataset_id=dataset_id, user_id=user_id)

        # add the metadata used to filter in the documents
        for d in request_body.documents:
            if d.metadata is None:
                d.metadata = {}

            d.metadata.update(request_body.where)

        # 3. upsert the updated documents
        return await self.add(
            request, dataset_id, AddRequest(documents=request_body.documents)
        )

    # health check endpoint
    def health(self, _: Request):
        """
        Return the status of the API.
        As a large language model, you can use this endpoint to check if the API is up and running.
        """
        self.logger.info("Health check successful")

        return JSONResponse(status_code=200, content={})

    def run(self) -> FastAPI:
        """
        Setup the endpoints and run the app
        """

        # if self.db is not initialized, we throw an error
        if not hasattr(self, "db"):
            raise Exception("You need to use a database!")
            # TODO: stop server gunicorn somehow

        if not hasattr(self, "embedder"):
            raise Exception("You need to use an embedder!")

        # Add the endpoints
        self.fastapi_app.add_api_route(
            "/v1/{dataset_id}/clear", self.clear, methods=["GET"]
        )
        self.fastapi_app.add_api_route("/v1/{dataset_id}", self.add, methods=["POST"])
        self.fastapi_app.add_api_route("/v1/{dataset_id}", self.update, methods=["PUT"])
        self.fastapi_app.add_api_route(
            "/v1/{dataset_id}", self.delete, methods=["DELETE"]
        )
        self.fastapi_app.add_api_route(
            "/v1/{dataset_id}/search", self.semantic_search, methods=["POST"]
        )
        self.fastapi_app.add_api_route(
            "/v1/datasets", self.get_datasets, methods=["GET"]
        )
        self.fastapi_app.add_api_route("/v1/{dataset_id}", self.list, methods=["GET"])
        self.fastapi_app.add_api_route(
            "/v1/{dataset_id}/replace", self.replace, methods=["POST"]
        )

        self.fastapi_app.add_api_route("/health", self.health, methods=["GET"])
        print(embedbase_ascii)

        return self.fastapi_app
