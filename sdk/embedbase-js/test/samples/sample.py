,from embedbase.api import get_app
from embedbase.settings import get_settings


settings = get_settings()
app = get_app(settings)
,import hashlib
import os
import time
import urllib.parse
import uuid

import openai
import requests
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pandas import DataFrame

from embedbase.db_utils import batch_select, get_vector_database
from embedbase.embeddings import batch_embed, embed, is_too_big
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

        # compute embeddings for documents without embeddings using batch_embed
        if not df[df.embedding.isna()].empty:
            df[df.embedding.isna()] = df[df.embedding.isna()].assign(
                embedding=batch_embed(df[df.embedding.isna()].data.tolist())
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
        df = df[  # HACK: is it fine to only return client the new documents?
            ~df.hash.isin([doc["hash"] for doc in existing_documents_in_this_pair])
        ]

        await vector_database.update(
            df,
            dataset_id,
            user_id,
            batch_size=UPLOAD_BATCH_SIZE,
            store_data=request_body.store_data,
        )

        logger.info(f"Uploaded {len(df)} documents")
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
        query_embedding = embed(query)[0]["embedding"]

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
        logger.info("Health check")
        # get headers
        headers = request.headers
        # Handle here any business logic for ensuring you're application is healthy (DB connections, etc...)
        r = requests.post(
            f"http://0.0.0.0:{PORT}/v1/test",
            json={
                "documents": [],
            },
            # forward headers
            headers=headers,
        )
        r.raise_for_status()
        logger.info("Health check successful")

        return JSONResponse(status_code=200, content={})

    return app


if __name__ == "__main__":
    settings = get_settings()
    get_app(settings)
,from abc import ABC, abstractmethod
from typing import Coroutine, List, Optional
import asyncio
from pandas import DataFrame
import itertools

from embedbase.settings import Settings


class VectorDatabase(ABC):
    """
    Base class for all vector databases
    """

    @abstractmethod
    async def select(
        self,
        ids: List[str] = [],
        hashes: List[str] = [],
        dataset_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[dict]:
        """
        :param ids: list of ids
        :param hashes: list of hashes
        :param dataset_id: dataset id
        :param user_id: user id
        :return: list of documents
        """
        raise NotImplementedError

    @abstractmethod
    async def update(
        self,
        df: DataFrame,
        dataset_id: str,
        user_id: Optional[str] = None,
        batch_size: Optional[int] = 100,
        store_data: bool = True,
    ) -> Coroutine:
        """
        :param df: dataframe
        :param dataset_id: dataset id
        :param user_id: user id
        :param batch_size: batch size
        :param store_data: store data in database?
        """
        raise NotImplementedError

    @abstractmethod
    async def delete(
        self, ids: List[str], dataset_id: str, user_id: Optional[str] = None
    ) -> None:
        """
        :param ids: list of ids
        :param dataset_id: dataset id
        :param user_id: user id
        """
        raise NotImplementedError

    @abstractmethod
    async def search(
        self,
        vector: List[float],
        top_k: Optional[int],
        dataset_id: str,
        user_id: Optional[str] = None,
    ) -> List[dict]:
        """
        :param vector: vector
        :param top_k: top k
        :param dataset_id: dataset id
        :param user_id: user id
        :return: list of documents
        """
        raise NotImplementedError

    @abstractmethod
    async def clear(self, dataset_id: str, user_id: Optional[str] = None) -> None:
        """
        :param dataset_id: dataset id
        :param user_id: user id
        """
        raise NotImplementedError

    @abstractmethod
    async def get_datasets(self, user_id: Optional[str] = None) -> List[str]:
        """
        :param user_id: user id
        :return: list of datasets
        """
        raise NotImplementedError
,# an enum to pick from either pinecone, weaviate, or supabase
import asyncio
import itertools
from enum import Enum
from typing import List, Optional

from embedbase.db import VectorDatabase
from embedbase.pinecone_db import Pinecone
from embedbase.settings import Settings, VectorDatabaseEnum
from embedbase.supabase_db import Supabase
from embedbase.weaviate_db import Weaviate


async def batch_select(
    vector_database: VectorDatabase,
    hashes_to_fetch: List[str],
    dataset_id: Optional[str] = None,
    user_id: Optional[str] = None,
):
    """
    :param vector_database: vector database
    :param hashes_to_fetch: list of hashes
    :param dataset_id: dataset id
    :param user_id: user id
    """
    n = 200
    hashes_to_fetch = [
        hashes_to_fetch[i : i + n] for i in range(0, len(hashes_to_fetch), n)
    ]

    async def _fetch(hashes) -> List[dict]:
        try:
            return await vector_database.select(
                hashes=hashes, dataset_id=dataset_id, user_id=user_id
            )
        except Exception as e:
            raise e

    existing_documents = await asyncio.gather(*[_fetch(ids) for ids in hashes_to_fetch])
    return itertools.chain.from_iterable(existing_documents)


def get_vector_database(settings: Settings) -> VectorDatabase:
    if settings.vector_database == VectorDatabaseEnum.pinecone:
        return Pinecone(
            api_key=settings.pinecone_api_key,
            environment=settings.pinecone_environment,
            index_name=settings.pinecone_index,
        )
    elif settings.vector_database == VectorDatabaseEnum.supabase:
        return Supabase(
            url=settings.supabase_url,
            key=settings.supabase_key,
        )
    elif settings.vector_database == VectorDatabaseEnum.weaviate:
        return Weaviate()
    else:
        raise Exception(
            "Invalid vector database, it must be pinecone, supabase or weaviate"
        )
,from functools import lru_cache
import typing
import numpy as np
import openai
from tenacity import (
    retry,
    retry_if_not_exception_type,
    stop_after_attempt,
    wait_exponential,
)
import tiktoken
from embedbase.utils import batched

EMBEDDING_MODEL = "text-embedding-ada-002"
EMBEDDING_CTX_LENGTH = 8191
EMBEDDING_ENCODING = "cl100k_base"

def is_too_big(text: str):
    encoding = tiktoken.get_encoding(EMBEDDING_ENCODING)
    tokens = encoding.encode(text)
    if len(tokens) > EMBEDDING_CTX_LENGTH:
        return True
        
    return False

@retry(
    wait=wait_exponential(multiplier=1, min=1, max=3),
    stop=stop_after_attempt(3),
    # TODO: send pr/issue on https://github.com/openai/openai-python/blob/94428401b4f71596e4a1331102a6beee9d8f0bc4/openai/__init__.py#L25
    # To expose openai.AuthenticationError
    retry=retry_if_not_exception_type(openai.InvalidRequestError),
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


def chunked_tokens(text, encoding_name, chunk_length):
    encoding = tiktoken.get_encoding(encoding_name)
    tokens = encoding.encode(text)
    chunks_iterator = batched(tokens, chunk_length)
    yield from chunks_iterator

def batch_embed(texts, model=EMBEDDING_MODEL, max_tokens=EMBEDDING_CTX_LENGTH, encoding_name=EMBEDDING_ENCODING, average=True):
    chunk_embeddings = []
    chunk_lens = []
    chunks = []
    for text in texts:
        for chunk in chunked_tokens(text, encoding_name=encoding_name, chunk_length=max_tokens):
            chunks.append(chunk)
            # chunk_embeddings.append(embed(chunk, model=model))
            chunk_lens.append(len(chunk))
    chunk_embeddings = [e["embedding"] for e in embed(chunks, model=model)]
    if average:
        # average the embeddings of the chunks,
        # len(chunk_embeddings) == len(texts)
        chunk_embeddings = [
            np.mean(chunk_embeddings[i : i + chunk_lens[i]], axis=0).tolist()
            for i in range(len(texts))
        ]
    return chunk_embeddings,from typing import Tuple
import warnings
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def enable_firebase_auth(app: FastAPI):
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
            # add uid to scope
            request.scope["uid"] = decoded_token["uid"]
        except Exception as err:
            warnings.warning(f"Error verifying token: {err}")
            return JSONResponse(status_code=401, content={"error": "invalid token"})

        response = await call_next(request)
        return response
,import logging

from embedbase.settings import Settings
from logging import Logger

def get_logger(settings: Settings) -> Logger:
    logger = logging.getLogger("embedbase")
    logger.setLevel(settings.log_level)
    handler = logging.StreamHandler()
    handler.setLevel(settings.log_level)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger
,from typing import List
from embedbase.settings import Settings
from starlette.middleware import Middleware


def get_middlewares(logger, settings: Settings) -> List[Middleware]:
    middlewares = []
    from starlette.middleware import Middleware

    for i, m in enumerate(settings.middlewares):
        # import python file at path m
        # and add the first class found to the list

        try:
            logger.info(f"Importing middleware {m}")
            segments = m.split(".")
            logger.debug(f"Segments {segments}")
            module_name = ".".join(segments[0:-1])
            logger.debug(f"Module name {module_name}")
            class_name = segments[-1]
            logger.debug(f"Class name {class_name}")
            module = __import__(module_name, fromlist=[class_name])
            logger.debug(f"Module {module}")
            dirs = dir(module)
            logger.debug(f"Dirs {dirs}")
            middleware_class = getattr(module, class_name)
            logger.debug(f"Middleware class {middleware_class}")
            middlewares.append(Middleware(middleware_class))
            logger.info(f"Loaded middleware {m}")
        except Exception as e:
            logger.error(f"Error loading middleware {m}: {e}")
    return middlewares
,from typing import List
from pydantic import BaseModel

# TODO: response models once stable

class Document(BaseModel):
    # data can be
    # - a string - for example  "This is a document"
    # TODO: currently only string is supported (later could be images, audio, multi/cross-modal)
    # etc.
    data: str


class AddRequest(BaseModel):
    documents: List[Document]
    store_data: bool = True


class DeleteRequest(BaseModel):
    ids: List[str]


class SearchRequest(BaseModel):
    query: str
    top_k: int = 6
,import urllib.parse
from typing import Coroutine, List, Optional

from pandas import DataFrame

from embedbase.db import VectorDatabase


class Pinecone(VectorDatabase):
    def __init__(
        self,
    ):
        """
        pinecone
        """
        raise NotImplementedError(
            "Pinecone is not supported."
            + "If you want to use Pinecone, please"
            + " contact us"
        )
,from enum import Enum
from functools import lru_cache
import typing
import os
from pydantic_yaml import YamlModel
import openai

SECRET_PATH = "/secrets" if os.path.exists("/secrets") else ".."
# if can't find config.yaml in .. try . now (local dev)
if not os.path.exists(SECRET_PATH + "/config.yaml"):
    SECRET_PATH = "."

if not os.path.exists(SECRET_PATH + "/config.yaml"):
    # exit process with error
    print("ERROR: Missing config.yaml file")


class VectorDatabaseEnum(str, Enum):
    pinecone = "pinecone"
    supabase = "supabase"
    weaviate = "weaviate"


class Settings(YamlModel):
    vector_database: VectorDatabaseEnum = VectorDatabaseEnum.supabase
    pinecone_api_key: typing.Optional[str] = None
    pinecone_index: typing.Optional[str] = None
    pinecone_environment: typing.Optional[str] = None
    openai_api_key: str
    openai_organization: str
    model: str = "text-embedding-ada-002"
    log_level: str = "INFO"
    auth: typing.Optional[str] = None
    sentry: typing.Optional[str] = None
    firebase_service_account_path: typing.Optional[str] = None
    middlewares: typing.Optional[typing.List[str]] = None
    supabase_url: typing.Optional[str] = None
    supabase_key: typing.Optional[str] = None


@lru_cache()
def get_settings():
    settings = Settings.parse_file(SECRET_PATH + "/config.yaml")

    # HACK: unless other AI api are supported it's hardcoded here
    openai.api_key = settings.openai_api_key
    openai.organization = settings.openai_organization

    # if firebase, init firebase
    if settings.auth and settings.auth == "firebase":
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(settings.firebase_service_account_path)
        firebase_admin.initialize_app(cred)
    return settings
,import re
from typing import Tuple, List


# unused
def is_upper_case_adjacent(s):
    s = s.split(" ")
    s = list(filter(lambda x: not re.match(r"[^A-Za-zäöüÄÖÜß]", x), s))
    for i in range(len(s) - 1):
        if s[i].isupper() and s[i + 1].isupper():
            return True
    return False


def string_similarity(
    str1: str, str2: str, substring_length: int = 2, case_sensitive: bool = False
) -> float:
    """
    Calculate similarity between two strings using
    https://en.wikipedia.org/wiki/S%C3%B8rensen%E2%80%93Dice_coefficient
    Computing time O(n)
    :param str1: First string to match
    :param str2: Second string to match
    :param substring_length: Optional. Length of substring to be used in calculating similarity. Default 2.
    :param case_sensitive: Optional. Whether you want to consider case in string matching. Default false;
    :return: Number between 0 and 1, with 0 being a low match score.
    """
    if not case_sensitive:
        str1 = str1.lower()
        str2 = str2.lower()

    if len(str1) < substring_length or len(str2) < substring_length:
        return 0

    m = {}
    for i in range(len(str1) - (substring_length - 1)):
        substr1 = str1[i : substring_length + i]
        m[substr1] = m.get(substr1, 0) + 1

    match = 0
    for j in range(len(str2) - (substring_length - 1)):
        substr2 = str2[j : substring_length + j]
        count = m.get(substr2, 0)

        if count > 0:
            match += 1
            m[substr2] = count - 1

    return (match * 2) / (len(str1) + len(str2) - ((substring_length - 1) * 2))


def group_by_similarity(
    sentences: List[str], threshold: float = 0.75
) -> List[List[str]]:
    """
    This is a function that takes a list of sentences
    and create groups of similarity and return them
    Complexity:
    Compute: O(n^2)
    :param sentences: The list of sentences to check.
    :type sentences: List[str]
    :param threshold: The threshold to consider similarity. Default 0.75.
    :type threshold: float, optional
    :return: Clusters of sentences.
    """
    groups = []
    # TODO: should ignore empty strings or option to ignore len < X
    for i in range(len(sentences)):
        sentence = sentences[i]
        is_in_group = False
        for j in range(len(groups)):
            group = groups[j]
            if len(group) == 0:
                continue
            similarity = sum([string_similarity(cur, sentence) for cur in group]) / len(
                group
            )
            if similarity >= threshold:
                is_in_group = True
                group.append(sentence)
        if not is_in_group:
            groups.append([sentence])
    return groups


def group_by_similarity_distinct(sentences: List[str], threshold: float = 0.75) -> map:
    """
    Given a list of sentences, group them by similarity,
    filter groups of size 2 or more,
    flatten the list by taking the shortest sentence in the groups
    :param sentences:
    :param threshold:
    :return:
    """
    groups = group_by_similarity(sentences, threshold)
    f = filter(lambda group: len(group) > 1, groups)
    m = map(lambda group: min(group, key=len), f)
    return m
,from typing import Tuple
import warnings
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def enable_supabase_auth(app: FastAPI):
    @app.middleware("http")
    async def supabase_auth(request: Request, call_next) -> Tuple[str, str]:
        raise NotImplementedError,import asyncio
from typing import Coroutine, List, Optional
from pandas import DataFrame, Series
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

    async def select(
        self,
        ids: List[str] = [],
        hashes: List[str] = [],
        dataset_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[dict]:
        # either ids or hashes must be provided
        assert ids or hashes, "ids or hashes must be provided"

        req = self.supabase.table("documents").select("*")
        if ids:
            req = req.in_("id", ids)
        if hashes:
            req = req.in_("hash", hashes)
        if dataset_id:
            req = req.eq("dataset_id", dataset_id)
        if user_id:
            req = req.eq("user_id", user_id)
        return req.execute().data

    async def update(
        self,
        df: DataFrame,
        dataset_id: str,
        user_id: Optional[str] = None,
        batch_size: Optional[int] = 100,
        store_data: bool = True,
    ) -> Coroutine:
        df_batcher = BatchGenerator(batch_size)
        batches = [batch_df for batch_df in df_batcher(df)]

        async def _insert(batch_df: DataFrame):
            def _d(row: Series):
                data = {
                    "id": row.id,
                    "embedding": row.embedding,
                    "hash": row.hash,
                    "dataset_id": dataset_id,
                    "user_id": user_id,
                }
                if store_data:
                    data["data"] = row.data
                return data

            response = (
                self.supabase.table("documents")
                .upsert([_d(row) for _, row in batch_df.iterrows()])
                .execute()
            )
            return response

        # TODO: not sure truly parallel, python garbage
        results = await asyncio.gather(*[_insert(batch_df) for batch_df in batches])
        return results

    async def delete(
        self,
        ids: List[str],
        dataset_id: str,
        user_id: Optional[str] = None,
    ) -> None:
        req = self.supabase.table("documents").delete().eq("dataset_id", dataset_id)
        if user_id:
            req = req.eq("user_id", user_id)
        return req.in_("id", ids).execute()

    async def search(
        self,
        vector: List[float],
        top_k: Optional[int],
        dataset_id: str,
        user_id: Optional[str] = None,
    ) -> List[dict]:
        d = {
            "query_embedding": vector,
            "similarity_threshold": 0.1,  # TODO: make this configurable
            "match_count": top_k,
            "query_dataset_id": dataset_id,
        }
        if user_id:
            d["query_user_id"] = user_id
        return (
            self.supabase.rpc(
                "match_documents",
                d,
            )
            .execute()
            .data
        )

    async def clear(self, dataset_id: str, user_id: Optional[str] = None) -> None:
        req = self.supabase.table("documents").delete().eq("dataset_id", dataset_id)
        if user_id:
            req = req.eq("user_id", user_id)
        return req.execute()

    async def get_datasets(self, user_id: Optional[str] = None) -> List[str]:
        # TODO: https://github.com/PostgREST/postgrest/issues/915
        # HACK: no distinct/group by for uniqueness?
        # HACK: risky, need to fix for scaling,
        # HACK: if many datasets / rows will be fucked up
        req = self.supabase.table("documents").select("dataset_id")
        if user_id:
            req = req.eq("user_id", user_id)
        data = req.execute().data
        return list(set([d["dataset_id"] for d in data]))
,import pytest
from httpx import AsyncClient
from embedbase.api import get_app

from embedbase.firebase_auth import enable_firebase_auth
from embedbase.settings import get_settings
from embedbase.test_utils import clear_dataset, unit_testing_dataset


@pytest.mark.asyncio
async def test_enable_firebase_auth():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    # before enabling auth, we should be able to make queries
    # without any authorization header
    enable_firebase_auth(app)

    # after enabling auth, we should get a 401 error
    # when not providing an authorization header
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}/search",
            json={"query": "bob"},
        )
        assert response.status_code == 401
    # when providing an authorization header, we should be able to make queries
    # TODO: cannot create id token on backend :/
,"""
Tests at the database abstraction level.
"""

import hashlib
from typing import List

import pandas as pd
import pytest

from embedbase.db import VectorDatabase
from embedbase.settings import get_settings
from embedbase.supabase_db import Supabase
from embedbase.test_utils import clear_dataset, unit_testing_dataset

from .embeddings import embed

settings = get_settings()
vector_databases: List[VectorDatabase] = [
    Supabase(
        url=settings.supabase_url,
        key=settings.supabase_key,
    ),
]


@pytest.mark.asyncio
async def test_search():
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = embed(d)
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.search(
            embeddings[0]["embedding"],
            top_k=2,
            dataset_id=unit_testing_dataset,
        )
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0]["id"] == "0", f"failed for {vector_database}"
        assert results[0]["data"] == d[0], f"failed for {vector_database}"
        assert results[0]["embedding"], f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_fetch():
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = embed(d)
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.select(ids=["0"], dataset_id=unit_testing_dataset)
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0]["id"] == "0", f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_fetch_by_hash():
    d = [
        "Bob is a human",
        "The quick brown fox jumps over the lazy dog",
    ]
    embeddings = embed(d)
    df = pd.DataFrame(
        [
            {
                "data": d[i],
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(embeddings)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.select(
            hashes=[df.hash[0]], dataset_id=unit_testing_dataset
        )
        assert len(results) > 0, f"failed for {vector_database}"
        assert results[0]["id"] == "0", f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_clear():
    data = [
        {"embedding": [0.0] * 1536},
        {"embedding": [0.0] * 1536},
    ]
    df = pd.DataFrame(
        [
            {
                "data": "Bob is a human",
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(data)
        ],
        columns=["data", "embedding", "id", "hash"],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)
        results = await vector_database.search(
            data[0]["embedding"],
            top_k=2,
            dataset_id=unit_testing_dataset,
        )
        # dont care about ordering (postgres & pinecone run different algorithms)
        ids = sorted([result["id"] for result in results])
        assert ids[0] == "0", f"failed for {vector_database}"
        assert ids[1] == "1", f"failed for {vector_database}"
        await vector_database.clear(unit_testing_dataset)

    for vector_database in vector_databases:
        results = await vector_database.search(
            data[0]["embedding"],
            top_k=2,
            dataset_id=unit_testing_dataset,
        )
        assert len(results) == 0, f"failed for {vector_database}"


@pytest.mark.asyncio
async def test_upload():
    data = [
        {"embedding": [0.0] * 1536},
        {"embedding": [0.0] * 1536},
    ]
    df = pd.DataFrame(
        [
            {
                "data": "Bob is a human",
                "embedding": document["embedding"],
                "id": str(i),
            }
            for i, document in enumerate(data)
        ],
        columns=[
            "data",
            "embedding",
            "id",
            "hash",
        ],
    )
    df.hash = df.data.apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    for vector_database in vector_databases:
        await vector_database.clear(unit_testing_dataset)
        await vector_database.update(df, unit_testing_dataset)

        results = await vector_database.search(
            data[0]["embedding"],
            top_k=2,
            dataset_id=unit_testing_dataset,
        )
        # dont care about ordering (postgres & pinecone run different algorithms)
        ids = sorted([result["id"] for result in results])
        assert ids[0] == "0", f"failed for {vector_database}"
        assert ids[1] == "1", f"failed for {vector_database}"
,# import pytest
# from embedbase.embeddings import batch_embed
# import openai
# from embedbase.settings import get_settings

# settings = get_settings()
# openai.api_key = settings.openai_api_key
# openai.organization = settings.openai_organization


# @pytest.mark.asyncio
# async def test_batch_embed_large():
#     # many large texts
#     data = batch_embed(["".join("AGI " * 10_000) for _ in range(10)])
#     assert len(data) == 10
#     assert [len(d) for d in data] == [1536] * 10
,"""
Tests at the end-to-end abstraction level.
"""

import math
from random import randint

import numpy as np
import pandas as pd
import pytest
import pytest_mock

from httpx import AsyncClient

from embedbase.embeddings import embed
from embedbase.settings import Settings, get_settings
from embedbase.test_utils import clear_dataset, unit_testing_dataset

from .api import get_app


@pytest.mark.asyncio
async def test_clear():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    df = pd.DataFrame(
        [
            "".join(
                [
                    chr(math.floor(97 + 26 * np.random.rand()))
                    for _ in range(randint(500, 800))
                ]
            )
            for _ in range(10)
        ],
        columns=["text"],
    )
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}",
            json={
                "documents": [
                    {
                        "data": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
            },
        )
        assert response.status_code == 200
        json_response = response.json()
        assert len(json_response.get("results")) == 10

    await clear_dataset()
    # search now
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}/search", json={"query": "bob"}
        )
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "bob"
        assert len(json_response.get("similarities")) == 0


@pytest.mark.asyncio
async def test_refresh_small_documents():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    df = pd.DataFrame(
        [
            "".join(
                [
                    chr(math.floor(97 + 26 * np.random.rand()))
                    for _ in range(randint(500, 800))
                ]
            )
            for _ in range(10)
        ],
        columns=["text"],
    )
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}",
            json={
                "documents": [
                    {
                        "data": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
            },
        )
        assert response.status_code == 200
        json_response = response.json()
        assert len(json_response.get("results")) == 10


@pytest.mark.asyncio
async def test_sync_no_id_collision():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    df = pd.DataFrame(
        ["foo" for _ in range(10)],
        columns=["text"],
    )
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}",
            json={
                "documents": [
                    {
                        "data": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
            },
        )
        assert response.status_code == 200
        json_response = response.json()
        # make sure all ids are unique
        ids = list(set([e["id"] for e in json_response.get("results")]))
        assert len(ids) == 10


@pytest.mark.asyncio
async def test_save_clear_data():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    df = pd.DataFrame(
        ["bob is a human"],
        columns=["text"],
    )
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            "/v1/unit_test",
            json={
                "documents": [
                    {
                        "data": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
                "store_data": False,
            },
        )
        assert response.status_code == 200
        json_response = response.json()
        assert len(json_response.get("results")) == 1
    # now search shouldn't have the "data" field in the response
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            "/v1/unit_test/search",
            json={"query": "bob"},
        )
        assert response.status_code == 200
        json_response = response.json()
        assert len(json_response.get("similarities")) > 0
        assert json_response.get("similarities")[0].get("data") is None


@pytest.mark.asyncio
async def test_health_properly_forward_headers():
    import requests_mock

    settings = get_settings()
    app = get_app(settings)
    # mock http://0.0.0.0:8000/v1/test
    with requests_mock.Mocker(
        real_http=True,
        case_sensitive=True,
    ) as m:
        m.post("http://0.0.0.0:8080/v1/test")
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.get(
                "/health",
                headers={"Authorization": "Bearer 123"},
            )
            # TODO: any way to listen to the request and check the headers?
            # without using pcap or hacks like that lol?
            assert response.status_code == 200


@pytest.mark.asyncio
async def test_adding_twice_the_same_data_is_ignored():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    d = [
        "The lion is the king of the jungle",
        "The lion is a large cat",
        "The lion is a carnivore",
    ]
    df = pd.DataFrame({"data": d})

    async def _i(results_length):
        async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
            response = await client.post(
                f"/v1/{unit_testing_dataset}",
                json={
                    "documents": [
                        {
                            "data": data,
                        }
                        for i, data in enumerate(df.data.tolist())
                    ],
                },
            )
            assert response.status_code == 200
            json_response = response.json()
            assert len(json_response.get("results")) == results_length

    # insert twice the same ting
    await _i(3)
    # should have been ignored
    await _i(0)

    # search should not have duplicates
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}/search", json={"query": "Feline animal"}
        )
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "Feline animal"
        assert len(json_response.get("similarities")) == 3
        # check that there are no duplicates
        for idx, lion in enumerate(
            sorted([e["data"] for e in json_response.get("similarities")])
        ):
            assert lion == sorted(d)[idx], f"{lion} != {sorted(d)[idx]}"


@pytest.mark.asyncio
async def test_insert_large_documents_should_fail():
    settings = get_settings()
    app = get_app(settings)
    await clear_dataset()
    # large texts > 10.000 characters
    d = ["".join("agi " * 10_000) for _ in range(10)]
    df = pd.DataFrame({"data": d})

    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}",
            json={
                "documents": [
                    {
                        "data": data,
                    }
                    for i, data in enumerate(df.data.tolist())
                ],
            },
        )
        assert response.status_code == 400

    # now search
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}/search", json={"query": "a", "top_k": 100}
        )
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "a"
        assert len(json_response.get("similarities")) == 0


@pytest.mark.asyncio
async def test_get_datasets_without_auth():
    """
    should create a dataset by inserting some data
    and return a list of datasets
    """
    await clear_dataset()
    settings = get_settings()
    app = get_app(settings)
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            f"/v1/datasets",
        )
        assert response.status_code == 200
        json_response = response.json()
        # shouldn't have "unit_testing_dataset" in the list
        assert unit_testing_dataset not in json_response.get("datasets")

    d = [
        "The lion is the king of the jungle",
        "The lion is a large cat",
        "The lion is a carnivore",
    ]
    df = pd.DataFrame({"data": d})
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}",
            json={
                "documents": [
                    {
                        "data": data,
                    }
                    for i, data in enumerate(df.data.tolist())
                ],
            },
        )
        assert response.status_code == 200
        json_response = response.json()
        assert len(json_response.get("results")) == 3

    # get datasets
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            f"/v1/datasets",
        )
        assert response.status_code == 200
        json_response = response.json()
        # should have "unit_testing_dataset" in the list
        assert unit_testing_dataset in json_response.get("datasets")


@pytest.mark.asyncio
async def test_get_datasets_with_auth(mocker):
    """
    an authenticated client
    should create a dataset by inserting some data
    and return a list of datasets
    another authenticated client
    should create a dataset by inserting some data
    and get a list of dataset, only his own
    """
    # TODO: does not FUCKING work?
    mocker.patch("embedbase.utils.get_user_id", return_value="user1")
    settings = get_settings()
    app = get_app(settings)

    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            f"/v1/datasets",
        )
        print(response.json())
,from httpx import AsyncClient

from embedbase.settings import get_settings

from .api import get_app

unit_testing_dataset = "unit_test"


async def clear_dataset(dataset_id: str = unit_testing_dataset):
    settings = get_settings()
    app = get_app(settings)
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            f"/v1/{dataset_id}/clear",
        )
        assert response.status_code == 200
,from typing import Iterator
from fastapi import Request
import numpy as np
import pandas as pd
from pandas import DataFrame
import sys

class BatchGenerator:
    """ Models a simple batch generator that make chunks out of an input DataFrame. """
    
    def __init__(self, batch_size: int = 10) -> None:
        self.batch_size = batch_size
    
    def to_batches(self, df: pd.DataFrame) -> Iterator[pd.DataFrame]:
        """ Makes chunks out of an input DataFrame. """
        # drop index
        df = df.reset_index(drop=True)
        splits = self.splits_num(df.shape[0])
        if splits <= 1:
            yield df
        else:
            for chunk in np.array_split(df, splits):
                yield chunk
    
    def splits_num(self, elements: int) -> int:
        """ Determines how many chunks DataFrame contians. """
        return round(elements / self.batch_size)
    
    __call__ = to_batches


def too_big_rows(df: DataFrame):
    """
    way to avoid
    Reason: Bad Request
    HTTP response headers: HTTPHeaderDict({'content-type': 'application/json', 'date': 'Wed, 04 Jan 2023 15:18:40 GMT', 'x-envoy-upstream-service-time': '1', 'content-length': '115', 'server': 'envoy'})
    HTTP response body: {"code":3,"message":"metadata size is 11759 bytes, which exceeds the limit of 10240 bytes per vector","details":[]}
    Check if data is small enough

    return size in bytes
    """
    # find too big rows in memory bytes
    too_big_rows = []
    for i, row in df.iterrows():
        size = 0
        size += sys.getsizeof(row.data)
        if size > 10240:
            too_big_rows.append(i)
            print(f"Row {i} is too big, size {size}")
    return too_big_rows

from itertools import islice

def batched(iterable, n):
    """Batch data into tuples of length n. The last batch may be shorter."""
    # batched('ABCDEFG', 3) --> ABC DEF G
    if n < 1:
        raise ValueError('n must be at least one')
    it = iter(iterable)
    while (batch := tuple(islice(it, n))):
        yield batch


def get_user_id(req: Request) -> str:
    return req.scope.get("uid")

,from embedbase.db import VectorDatabase


class Weaviate(VectorDatabase):
    def __init__(
        self,
    ):
        """
        weaviate.io
        """
        raise NotImplementedError(
            "Weaviate is not supported."
            + "If you want to use Weaviate, please"
            + " contact us"
        )
,from typing import Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import requests
class Enrich(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Tuple[str, str]:
        response = await call_next(request)
        blood_types = requests.get("https://random-data-api.com/api/v2/blood_types").json()
        response.headers["X-Enrich"] = str(blood_types)
        print("my middleware is running")
        print("enrich middleware did this:", blood_types)
        print("enrich middleware ran after processing_time middleware, look what it did")
        print("response.headers['X-Process-Time']", response.headers["X-Process-Time"])
        return response,import time
from typing import Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
class ProcessingTime(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Tuple[str, str]:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        print("my middleware is running")
        print("processing_time middleware did this:", str(process_time))
        return response,from setuptools import setup, find_packages

if __name__ == "__main__":

    # https://github.com/mautrix/telegram/blob/master/setup.py
    with open("optional-requirements.txt") as reqs:
        extras_require = {}
        current = []
        for line in reqs.read().splitlines():
            if line.startswith("#/"):
                extras_require[line[2:]] = current = []
            elif not line or line.startswith("#"):
                continue
            else:
                current.append(line)

    extras_require["all"] = list({dep for deps in extras_require.values() for dep in deps})

    # same for requirements.txt
    with open("requirements.txt") as reqs:
        install_requires = [line for line in reqs.read().splitlines() if not line.startswith("#")]


    setup(
        name="embedbase",
        packages=find_packages(),
        include_package_data=True,
        version="0.7.4",
        description="Open-source API for to easily create, store, and retrieve embeddings",
        install_requires=install_requires,
        extras_require=extras_require,
        classifiers=[
            "Development Status :: 4 - Beta",
            "Intended Audience :: Developers",
            "Topic :: Scientific/Engineering :: Artificial Intelligence",
            "License :: OSI Approved :: MIT License",
            "Programming Language :: Python :: 3.10",
        ],
    )