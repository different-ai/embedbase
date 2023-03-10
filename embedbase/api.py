import hashlib
import os
import time
import urllib.parse
import uuid

import requests
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pandas import DataFrame

from embedbase.db_utils import batch_select, get_vector_database
from embedbase.embeddings import embed, is_too_big
from embedbase.firebase_auth import enable_firebase_auth
from embedbase.logging_utils import get_logger
from embedbase.middleware_utils import get_middlewares
from embedbase.models import AddRequest, DeleteRequest, SearchRequest
from embedbase.settings import Settings, get_settings
from embedbase.utils import get_user_id


def get_app(settings: Settings):
    PORT = os.environ.get("PORT", 8080)
    UPLOAD_BATCH_SIZE = int(os.environ.get("UPLOAD_BATCH_SIZE", "100"))

    logger = get_logger(settings)
    middlewares = []
    if settings.middlewares:
        middlewares = get_middlewares(logger, settings)
    app = FastAPI(middleware=middlewares)

    if settings.sentry:
        logger.info("Enabling Sentry")
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry,
            # Set traces_sample_rate to 1.0 to capture 100%
            # of transactions for performance monitoring.
            # We recommend adjusting this value in production,
            traces_sample_rate=0.2,
            environment=os.environ.get("ENVIRONMENT", "development"),
            _experiments={
                "profiles_sample_rate": 1.0,
            },
        )

    if settings.auth == "firebase":
        logger.info("Enabling Firebase Auth")
        enable_firebase_auth(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    vector_database = get_vector_database(settings)

    @app.on_event("startup")
    async def startup_event():
        logger.info(f"Detected an upload batch size of {UPLOAD_BATCH_SIZE}")

    @app.get("/v1/{dataset_id}/clear")
    async def clear(
        request: Request,
        dataset_id: str,
        _: Settings = Depends(get_settings),
    ):
        user_id = get_user_id(request)

        await vector_database.clear(dataset_id, user_id)
        logger.info("Cleared index")
        return JSONResponse(status_code=200, content={})

    @app.post("/v1/{dataset_id}")
    async def add(
        request: Request,
        dataset_id: str,
        request_body: AddRequest,
        _: Settings = Depends(get_settings),
    ):
        """
        Refresh the embeddings for a given file
        """
        user_id = get_user_id(request)
        documents = request_body.documents

        filtered_data = []
        for doc in documents:
            if is_too_big(doc.data):
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
            columns=[
                "id",
                "data",
                "embedding",
                "hash",
            ],
        )

        start_time = time.time()
        logger.info(f"Refreshing {len(documents)} embeddings")

        if not df.data.any():
            logger.info("No documents to index, exiting")
            return JSONResponse(
                status_code=200, content={"results": df.to_dict(orient="records")}
            )

        # add column "hash" based on "data"
        df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

        df_length = len(df)

        logger.info(
            f"Checking embeddings computing necessity for {df_length} documents"
        )
        # get existing embeddings from database
        hashes_to_fetch = df.hash.tolist()
        existing_documents = await batch_select(
            vector_database,
            hashes_to_fetch,
            None,
            None,
        )
        # add existing embeddings to the dataframe
        for doc in existing_documents:
            df.loc[df.hash == doc["hash"], "embedding"] = doc["embedding"]

        # generate ids using hash of uuid + time to avoid collisions
        df.id = df.apply(
            lambda x: hashlib.sha256(
                (str(uuid.uuid4()) + str(time.time())).encode()
            ).hexdigest(),
            axis=1,
        )

        # count rows without embeddings
        rows_without_embeddings = df[df.embedding.isna()].shape[0]

        logger.info(
            f"We will compute embeddings for {rows_without_embeddings}/{len(df)} documents"
        )

        # compute embeddings for documents without embeddings using embed
        if not df[df.embedding.isna()].empty:
            df[df.embedding.isna()] = df[df.embedding.isna()].assign(
                embedding=embed(df[df.embedding.isna()].data.tolist())
            )

        # only insert if this dataset_id - user_id
        # pair does not have this hash
        existing_documents_in_this_pair = await batch_select(
            vector_database,
            hashes_to_fetch,
            dataset_id,
            user_id,
        )

        # filter out documents that already exist
        # in this dataset_id - user_id pair
        new_df = df[  # HACK: is it fine to only return client the new documents?
            ~df.hash.isin([doc["hash"] for doc in existing_documents_in_this_pair])
        ]

        await vector_database.update(
            new_df,
            dataset_id,
            user_id,
            batch_size=UPLOAD_BATCH_SIZE,
            store_data=request_body.store_data,
        )

        logger.info(f"Uploaded {len(new_df)} documents")
        end_time = time.time()
        logger.info(f"Uploaded in {end_time - start_time} seconds")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                # embeddings, ids and data are returned
                "results": df.to_dict(orient="records"),
            },
        )

    @app.delete("/v1/{dataset_id}")
    async def delete(
        request: Request,
        dataset_id: str,
        request_body: DeleteRequest,
        _: Settings = Depends(get_settings),
    ):
        """
        Delete a document from the index
        """
        user_id = get_user_id(request)

        ids = request_body.ids
        logger.info(f"Deleting {len(ids)} documents")
        quoted_ids = [urllib.parse.quote(id) for id in ids]
        await vector_database.delete(
            ids=quoted_ids, dataset_id=dataset_id, user_id=user_id
        )
        logger.info(f"Deleted {len(ids)} documents")

        return JSONResponse(status_code=status.HTTP_200_OK, content={})

    @app.post("/v1/{dataset_id}/search")
    async def semantic_search(
        request: Request,
        dataset_id: str,
        request_body: SearchRequest,
        _: Settings = Depends(get_settings),
    ):
        """
        Search for a given query in the corpus
        """
        query = request_body.query
        user_id = get_user_id(request)

        # if the query is too big, return an error
        if is_too_big(query):
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
        query_embedding = embed(query)[0]

        logger.info(f"Query {request_body.query} created embedding, querying index")

        query_response = await vector_database.search(
            top_k=top_k,
            vector=query_embedding,
            dataset_id=dataset_id,
            user_id=user_id,
        )

        similarities = []
        for match in query_response:
            decoded_id = urllib.parse.unquote(match["id"])
            logger.debug(f"ID: {decoded_id}")
            similarities.append(
                {
                    "score": match["score"],
                    "id": decoded_id,
                    "data": match["data"],
                    "hash": match["hash"],  # TODO: probably shouldn't return this
                    "embedding": match["embedding"],
                }
            )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"query": query, "similarities": similarities},
        )

    @app.get("/v1/datasets")
    async def get_datasets(
        request: Request,
    ):
        """
        Return a list of available datasets
        """
        user_id = get_user_id(request)
        datasets = await vector_database.get_datasets(user_id)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"datasets": datasets},
        )

    # health check endpoint
    @app.get("/health")
    def health(request: Request):
        """
        Return the status of the API
        """
        logger.info("Health check successful")

        return JSONResponse(status_code=200, content={})

    return app


if __name__ == "__main__":
    settings = get_settings()
    get_app(settings)
