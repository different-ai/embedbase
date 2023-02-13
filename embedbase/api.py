import asyncio
import hashlib
from multiprocessing.pool import ThreadPool
import time
from pandas import DataFrame
import os
from functools import lru_cache
import itertools
import typing
import logging
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from embedbase.models import (
    DeleteRequest,
    AddRequest,
    SearchRequest,
)
from fastapi.responses import JSONResponse
import urllib.parse
import numpy as np
from embedbase.pinecone_db import Pinecone
from embedbase.settings import Settings, get_settings
import openai
import sentry_sdk

from tenacity import retry
from tenacity.wait import wait_exponential
from tenacity.before import before_log
from tenacity.after import after_log
from tenacity.stop import stop_after_attempt
import requests
from typing import List, Tuple


settings = get_settings()
MAX_DOCUMENT_LENGTH = int(os.environ.get("MAX_DOCUMENT_LENGTH", "1000"))
PORT = os.environ.get("PORT", 8080)
UPLOAD_BATCH_SIZE = int(os.environ.get("UPLOAD_BATCH_SIZE", "100"))

logger = logging.getLogger("search")
logger.setLevel(settings.log_level)
handler = logging.StreamHandler()
handler.setLevel(settings.log_level)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)


if settings.sentry:
    logger.info("Enabling Sentry")
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

app = FastAPI()

if settings.auth == "firebase":
    from firebase_admin import auth

    @app.middleware("http")
    async def firebase_auth(request: Request, call_next) -> Tuple[str, str]:
        # extract token from header
        for name, value in request.headers.items():  # type: bytes, bytes
            print(name, value)
            if name == "authorization":
                authorization = value
                break
        else:
            authorization = None

        if not authorization:
            return JSONResponse(
                status_code=401, content={"error": "missing authorization header"}
            )

        s = authorization.split(" ")

        if len(s) != 2:
            return JSONResponse(
                status_code=401, content={"error": "invalid authorization header"}
            )

        token_type, token = s
        assert (
            token_type == "Bearer"
        ), "Authorization header must be `Bearer` type. Like: `Bearer LONG_JWT`"

        try:
            token = token.strip()
            decoded_token = auth.verify_id_token(token)
        except Exception as err:
            return JSONResponse(status_code=401, content={"error": "invalid token"})

        # add uid to scope
        request.scope["uid"] = decoded_token["userId"]
        response = await call_next(request)
        return response


if settings.middlewares:
    for i, m in enumerate(settings.middlewares):
        # import python file at path m
        # and call middleware(app)

        try:
            module = __import__(m, fromlist=["middleware"])
            module.middleware(app)
            # Verify contents of the module:
            print(dir(module))

            logger.info(f"Loaded middleware {m}")
        except Exception as e:
            logger.error(f"Error loading middleware {m}: {e}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vector_database = Pinecone(
    api_key=settings.pinecone_api_key,
    environment=settings.pinecone_environment,
    index_name=settings.pinecone_index,
)
openai.api_key = settings.openai_api_key
openai.organization = settings.openai_organization


@app.on_event("startup")
async def startup_event():
    result = await vector_database.fetch(ids=["foo"])  # TODO: container startup check
    if result:
        logger.info("Properly connected to Pinecone")
    else:
        raise Exception("Could not connect to Pinecone")
    logger.info(f"Detected an upload batch size of {UPLOAD_BATCH_SIZE}")


@lru_cache()
def no_batch_embed(sentence: str, _: Settings = Depends(get_settings)):
    """
    Compute the embedding for a given sentence
    """
    settings = get_settings()
    chunks = [sentence]
    if len(sentence) > 2000:
        chunks = [sentence[i : i + 2000] for i in range(0, len(sentence), 2000)]
    embeddings = embed(chunks, settings.model)
    if len(chunks) > 1:
        return np.mean([e["embedding"] for e in embeddings], axis=0).tolist()
    return embeddings[0]["embedding"]


@retry(
    wait=wait_exponential(multiplier=1, min=1, max=3),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.ERROR),
    stop=stop_after_attempt(3),
)
def embed(
    input: typing.List[str], model: str = "text-embedding-ada-002"
) -> typing.List[dict]:
    """
    Embed a list of sentences using OpenAI's API and retry on failure
    Only supports OpenAI's embedding models for now
    :param input: list of sentences to embed
    :param model: model to use
    :return: list of embeddings
    """
    return openai.Embedding.create(input=input, model=model)["data"]


@retry(
    wait=wait_exponential(multiplier=1, min=1, max=3),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.ERROR),
    stop=stop_after_attempt(3),
)

def get_namespace(request: Request, vault_id: str) -> str:
    return f"{request.scope.get('uid')}/{vault_id}"


@app.get("/v1/{vault_id}/clear")
async def clear(
    request: Request,
    vault_id: str,
    _: Settings = Depends(get_settings),
):
    namespace = get_namespace(request, vault_id)

    await vector_database.clear(namespace=namespace)
    logger.info("Cleared index")
    return JSONResponse(status_code=200, content={"status": "success"})


@app.post("/v1/{vault_id}")
async def add(
    request: Request,
    vault_id: str,
    request_body: AddRequest,
    _: Settings = Depends(get_settings),
):
    """
    Refresh the embeddings for a given file
    """
    namespace = get_namespace(request, vault_id)

    sentry_sdk.set_user({"id": vault_id})

    documents = request_body.documents
    # TODO: temporarily we ignore too big documents because pinecone doesn't support them
    df = DataFrame(
        [
            doc.dict()
            for doc in documents
            if doc.data is None
            or (doc.data is not None and len(doc.data) < MAX_DOCUMENT_LENGTH)
        ],
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
        return JSONResponse(status_code=200, content={"status": "success"})

    # add column "hash" based on "data"
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    df_length = len(df)
    existing_hashes = []

    if df.id.any():
        logger.info(
            f"Checking embeddings computing necessity for {df_length} documents"
        )
        # filter out documents that didn't change by checking their hash
        # in the index metadata
        ids_to_fetch = df.id.apply(urllib.parse.quote).tolist()
        # split in chunks of n because fetch has a limit of size
        # TODO: abstract away batching
        n = 200
        ids_to_fetch = [ids_to_fetch[i : i + n] for i in range(0, len(ids_to_fetch), n)]
        logger.info(f"Fetching {len(ids_to_fetch)} chunks of {n} ids")

        async def _fetch(ids) -> List[dict]:
            try:
                return await vector_database.fetch(ids=ids, namespace=namespace)
            except Exception as e:
                logger.error(f"Error fetching {ids}: {e}", exc_info=True)
                raise e

        existing_documents = await asyncio.gather(*[_fetch(ids) for ids in ids_to_fetch])
        flat_existing_documents = itertools.chain.from_iterable(
            [doc.vectors.values() for doc in existing_documents]
        )

        # TODO: might do also with https://docs.pinecone.io/docs/metadata-filtering#querying-an-index-with-metadata-filters

        # remove rows that have the same hash
        exisiting_contents = []
        for doc in flat_existing_documents:
            existing_hashes.append(doc.id)
            exisiting_contents.append(doc.get("metadata", {}).get("data"))
        df = df[
            ~df.apply(
                lambda x: x.hash in existing_hashes,
                axis=1,
            )
        ]
    else:
        # generate ids using hash + time
        df.id = df.hash.apply(lambda x: f"{x}-{int(time.time() * 1000)}")

    diff = df_length - len(df)

    logger.info(f"Filtered out {diff} documents that didn't change at all")

    if not df.data.any():
        logger.info(
            "No documents to index found after filtering existing ones, exiting"
        )
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "ignored_ids": existing_hashes,
                "inserted_ids": df.id.tolist(),
            },
        )

    # parallelize
    response = embed(df.data.tolist(), settings.model)
    df.embedding = [e["embedding"] for e in response]

    # TODO average the embeddings over "embedding" column grouped by index, merge back into df
    # s = (
    #     df.apply(lambda x: pd.Series(x["embedding"]), axis=1)
    #     .groupby(level=0)
    #     .mean()
    #     .reset_index()
    #     .drop("index", axis=1)
    # )
    # # merge s column into a single column , ignore index
    # df.embedding = s.apply(lambda x: x.tolist(), axis=1)
    # TODO: problem is that pinecone doesn't support this large of an input
    await vector_database.update(df, namespace, batch_size=UPLOAD_BATCH_SIZE)

    logger.info(f"Indexed & uploaded {len(df)} sentences")
    end_time = time.time()
    logger.info(f"Indexed & uploaded in {end_time - start_time} seconds")

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "success",
            "ignored_ids": existing_hashes,
            "inserted_ids": df.id.tolist(),
        },
    )


@app.delete("/v1/{vault_id}")
async def delete(
    request: Request,
    vault_id: str,
    request_body: DeleteRequest,
    _: Settings = Depends(get_settings),
):
    """
    Delete a document from the index
    """
    namespace = get_namespace(request, vault_id)
    sentry_sdk.set_user({"id": vault_id})

    ids = request_body.ids
    logger.info(f"Deleting {len(ids)} documents")
    quoted_ids = [urllib.parse.quote(id) for id in ids]
    await vector_database.delete(ids=quoted_ids, namespace=namespace)
    logger.info(f"Deleted {len(ids)} documents")

    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "success"})


@app.post("/v1/{vault_id}/search")
async def semantic_search(
    request: Request,
    vault_id: str,
    request_body: SearchRequest,
    _: Settings = Depends(get_settings),
):
    """
    Search for a given query in the corpus
    """
    query = request_body.query
    namespace = get_namespace(request, vault_id)
    sentry_sdk.set_user({"id": vault_id})

    top_k = 5  # TODO might fail if index empty?
    if request_body.top_k > 0:
        top_k = request_body.top_k
    query_embedding = no_batch_embed(query)

    logger.info(f"Query {request_body.query} created embedding, querying index")

    query_response = await vector_database.search(
        top_k=top_k,
        vector=query_embedding,
        namespace=namespace,
    )

    similarities = []
    for match in query_response:
        logger.debug(f"Match id: {match.id}")
        decoded_id = urllib.parse.unquote(match.id)
        logger.debug(f"Decoded id: {decoded_id}")
        similarities.append(
            {
                "score": match.score,
                "id": decoded_id,
                "data": match.metadata.get("data", None),
            }
        )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"query": query, "similarities": similarities},
    )


# health check endpoint
@app.get("/health")
def health():
    """
    Return the status of the API
    """
    logger.info("Health check")
    # Handle here any business logic for ensuring you're application is healthy (DB connections, etc...)
    r = requests.post(
        f"http://0.0.0.0:{PORT}/v1/test",
        json={
            "documents": [],
        },
    )
    r.raise_for_status()
    logger.info("Health check successful")

    return JSONResponse(
        status_code=200,
        content={"status": "success"},
    )
