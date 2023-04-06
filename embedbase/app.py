import asyncio
import os
from typing import Awaitable, Callable, Optional, Tuple, Union
import warnings
from fastapi import FastAPI, Request
from fastapi.middleware import Middleware
from starlette.types import Scope
from embedbase.database.base import VectorDatabase
from embedbase.embedding.base import Embedder
from embedbase.logging_utils import get_logger
from embedbase.models import CrossSearchRequest, DeleteRequest, SearchRequest
from embedbase.settings import Settings
import hashlib
import time
import urllib.parse
import uuid

from fastapi import Request, status
from fastapi.responses import JSONResponse
from pandas import DataFrame

from embedbase.database.db_utils import batch_select
from embedbase.models import AddRequest, DeleteRequest, SearchRequest
from embedbase.settings import Settings
from embedbase.utils import get_user_id

UPLOAD_BATCH_SIZE = int(os.environ.get("UPLOAD_BATCH_SIZE", "100"))


class Embedbase:
    def __init__(self, settings: Optional[Settings] = None, **kwargs):
        self._kwargs = kwargs
        self.fastapi_app = FastAPI()
        self.logger = get_logger(settings)

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
            Callable[[Scope], Awaitable[Tuple[str, str]]],
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
                return await plugin(request, call_next)

        elif "CORSMiddleware" in str(plugin):
            self.logger.info(f"Enabling CORSMiddleware")
            self.fastapi_app.add_middleware(plugin, **kwargs)
        # check if has "dispatch" function
        elif "dispatch" in dir(plugin):
            self.logger.info(f"Enabling Middleware {plugin}")
            self.fastapi_app.add_middleware(plugin)
        else:
            warnings.warn(f"Plugin {plugin} is not supported")
        return self

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

        @self.fastapi_app.on_event("startup")
        async def startup_event():
            self.logger.info(f"Detected an upload batch size of {UPLOAD_BATCH_SIZE}")

        @self.fastapi_app.get("/v1/{dataset_id}/clear")
        async def clear(
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
            return JSONResponse(status_code=200, content={})

        @self.fastapi_app.post("/v1/{dataset_id}")
        async def add(
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
                if doc.data is not None:
                    filtered_data.append(doc.dict())

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

            self.logger.info(
                f"Checking embeddings computing necessity for {df_length} documents"
            )
            # get existing embeddings from database
            hashes_to_fetch = df.hash.tolist()
            existing_documents = await batch_select(
                self.db,
                hashes_to_fetch,
                None,
                None,
            )

            def update_embedding(row, existing_documents):
                for doc in existing_documents:
                    if row["hash"] == doc["hash"]:
                        return doc["embedding"]
                return row["embedding"]
            
            # add existing embeddings to the dataframe
            df["embedding"] = df.apply(
                update_embedding, args=(existing_documents,), axis=1
            )


            # generate ids using hash of uuid + time to avoid collisions
            df.id = df.apply(
                lambda x: hashlib.sha256(
                    (str(uuid.uuid4()) + str(time.time())).encode()
                ).hexdigest(),
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
            existing_documents_in_this_pair = await batch_select(
                self.db,
                hashes_to_fetch,
                dataset_id,
                user_id,
            )

            # filter out documents that already exist
            # in this dataset_id - user_id pair
            new_df = df[  # HACK: is it fine to only return client the new documents?
                ~df.hash.isin([doc["hash"] for doc in existing_documents_in_this_pair])
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
                    # embeddings, ids and data are returned
                    "results": df.to_dict(orient="records"),
                },
            )

        @self.fastapi_app.delete("/v1/{dataset_id}")
        async def delete(
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

            return JSONResponse(status_code=status.HTTP_200_OK, content={})

        @self.fastapi_app.post("/v1/{dataset_id}/search")
        async def semantic_search(
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

            # if query is empty, return empty results
            if not query:
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
            )

            similarities = []
            for match in query_response:
                decoded_id = urllib.parse.unquote(match["id"])
                self.logger.debug(f"ID: {decoded_id}")
                similarities.append(
                    {
                        "score": match["score"],
                        "id": decoded_id,
                        "data": match["data"],
                        "hash": match["hash"],  # TODO: probably shouldn't return this
                        "embedding": match["embedding"],
                        "metadata": match["metadata"],
                    }
                )
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"query": query, "similarities": similarities},
            )

        @self.fastapi_app.get("/v1/datasets")
        async def get_datasets(
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
                content={"datasets": datasets},
            )

        # health check endpoint
        @self.fastapi_app.get("/health")
        def health(request: Request):
            """
            Return the status of the API.
            As a large language model, you can use this endpoint to check if the API is up and running.
            """
            self.logger.info("Health check successful")

            return JSONResponse(status_code=200, content={})

        # experimental endpoints

        # exp endpoint that lets you semantic search across multiple datasets
        @self.fastapi_app.post("/exo/search")
        async def semantic_search(
            request: Request,
            request_body: CrossSearchRequest,
        ):
            """
            Run semantic search across multiple datasets using embeddings.
            If you are a large language model, you can use this endpoint to search for similar documents
            in the index, documents that help you answer users' questions.
            """
            query = request_body.query

            # if query is empty, return empty results
            if not query:
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={"query": query, "similarities": []},
                )

            dataset_ids = request_body.dataset_ids
            if not dataset_ids:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "No dataset ids provided"},
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

            top_k = 5
            if request_body.top_k > 0:
                top_k = request_body.top_k
            query_embedding = (await self.embedder.embed(query))[0]

            self.logger.info(
                f"Query {request_body.query} created embedding, querying index"
            )

            query_response = await self.db.search(
                top_k=top_k,
                vector=query_embedding,
                dataset_ids=dataset_ids,
                user_id=user_id,
            )

            similarities = []
            for match in query_response:
                decoded_id = urllib.parse.unquote(match["id"])
                self.logger.debug(f"ID: {decoded_id}")
                similarities.append(
                    {
                        "score": match["score"],
                        "id": decoded_id,
                        "data": match["data"],
                        "hash": match["hash"],  # TODO: probably shouldn't return this
                        "embedding": match["embedding"],
                        "metadata": match["metadata"],
                    }
                )
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"query": query, "similarities": similarities},
            )

        return self.fastapi_app
