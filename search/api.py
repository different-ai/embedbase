import hashlib
from multiprocessing.pool import ThreadPool
import time
from pandas import DataFrame
import os
import json
from functools import lru_cache
import itertools
import typing
import logging
from fastapi import Depends, FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware
from search.middlewares.history.auths.firebase import firebase_auth
from search.middlewares.history.backends.firestore import FirestoreBackend
from search.middlewares.history.core import HistoryMiddleware
from search.models import (
    BaseSearchRequest,
    SearchClearRequest,
    SearchRefreshRequest,
    SearchRequest,
)
from fastapi.responses import JSONResponse
import pinecone
import urllib.parse
import numpy as np
from search.settings import Settings, get_settings
from .utils import BatchGenerator, too_big_rows
import openai
import sentry_sdk

from tenacity import retry
from tenacity.wait import wait_exponential
from tenacity.before import before_log
from tenacity.after import after_log
from tenacity.stop import stop_after_attempt
import requests
from search.strings import string_similarity
from firebase_admin import initialize_app, firestore, credentials
from starlette.types import Scope

settings = get_settings()
SECRET_FIREBASE_PATH = (
    "/secrets_firebase" if os.path.exists("/secrets_firebase") else ".."
)

if not os.path.exists(SECRET_FIREBASE_PATH + "/svc.prod.json"):
    SECRET_FIREBASE_PATH = "."
PORT = os.environ.get("PORT", 3333)
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

if settings.middlewares and settings.middlewares.history:
    logger.info("Enabling history middleware")
    cred = credentials.Certificate(SECRET_FIREBASE_PATH + "/svc.prod.json")
    initialize_app(cred)
    _firestore = firestore.client()
    async def handle_auth_error(exc: Exception, scope: Scope):
        status_code = (
            exc.status_code
            if hasattr(exc, "status_code")
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        message = exc.detail if hasattr(exc, "detail") else str(exc)

        logger.error(message, exc_info=True)
        try:
            sentry_sdk.capture_message(message, level="error")
        except:
            pass
        return JSONResponse(
            status_code=status_code,
            content={"message": message},
        )

    async def on_auth_success(user: str, group: str, scope: Scope):
        try:
            sentry_sdk.set_user({"id": user, "group": group})
        except:
            pass

    app.add_middleware(
        HistoryMiddleware,
        authenticate=firebase_auth,
        backend=FirestoreBackend(_firestore),
        on_auth_error=handle_auth_error,
        on_auth_success=on_auth_success,
    )




app.add_middleware(
    CORSMiddleware,
    allow_origins=["app://obsidian.md", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pinecone.init(api_key=settings.pinecone_api_key, environment="us-west1-gcp")
openai.api_key = settings.openai_api_key
openai.organization = settings.openai_organization
index = pinecone.Index("anotherai", pool_threads=8)



def note_to_embedding_format(
    note_path: str, note_tags: typing.List[str], note_content: str
) -> str:
    """
    Convert a note to the format expected by the embedding model
    """
    # return f"File:\n{note_path}\nTags:\n{note_tags}\nContent:\n{note_content}"
    return f"File:\n{note_path}\nContent:\n{note_content}"


@app.on_event("startup")
def startup_event():
    result = index.fetch(ids=["foo"])  # TODO: container startup check
    if result:
        logger.info("Properly connected to Pinecone")
    else:
        logger.error("Could not connect to Pinecone")
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
def upload_embeddings_to_vector_database(df: DataFrame, namespace: str):
    # TODO: batch size should depend on payload
    df_batcher = BatchGenerator(UPLOAD_BATCH_SIZE)
    logger.info("Uploading vectors namespace..")
    start_time_upload = time.time()
    batches = [batch_df for batch_df in df_batcher(df)]

    def _insert(batch_df: DataFrame):
        bigs = too_big_rows(batch_df)
        if len(bigs) > 0:
            logger.info(f"Ignoring {len(bigs)} rows that are too big")
        # remove rows that are too big, in the right axis
        batch_df = batch_df.drop(bigs, axis=0)
        response = index.upsert(
            vectors=zip(
                # url encode path
                batch_df.note_path.apply(urllib.parse.quote).tolist(),
                # batch_df.note_path,
                batch_df.note_embedding,
                [
                    {
                        "note_tags": tags,
                        "note_content": content,
                        "note_hash": note_hash,
                    }
                    for tags, content, note_hash in zip(
                        batch_df.note_tags,
                        batch_df.note_content,
                        batch_df.note_hash,
                    )
                ],
            ),
            namespace=namespace,
            async_req=True,
        )
        logger.info(f"Uploaded {len(batch_df)} vectors")
        return response

    [response.get() for response in map(_insert, batches)]

    logger.info(f"Uploaded in {time.time() - start_time_upload} seconds")


MAX_NOTE_LENGTH = int(os.environ.get("MAX_NOTE_LENGTH", "1000"))


def get_namespace(request: Request, request_body: BaseSearchRequest) -> str:
    return f"{request.scope.get('uid')}/{request_body.vault_id}"


@app.post("/v1/search/clear")
def clear_search(
    request: Request,
    request_body: SearchClearRequest,
    _: Settings = Depends(get_settings),
):
    namespace = get_namespace(request, request_body)

    index.delete(delete_all=True, namespace=namespace)
    logger.info("Cleared index")
    return JSONResponse(status_code=200, content={"status": "success"})


@app.post("/v1/search/refresh")
def refresh(
    request: Request,
    request_body: SearchRefreshRequest,
    _: Settings = Depends(get_settings),
):
    """
    Refresh the embeddings for a given file
    """
    namespace = get_namespace(request, request_body)

    sentry_sdk.set_user({"id": request_body.vault_id})

    notes = request_body.notes
    # TODO: temporarily we ignore too big notes because pinecone doesn't support them
    df = DataFrame(
        [
            note.dict()
            for note in notes
            if note.note_content is not None
            and len(note.note_content) < MAX_NOTE_LENGTH
        ],
        columns=[
            "note_path",
            "note_tags",
            "note_content",
            "path_to_delete",
            "note_embedding_format",
            "note_embedding",
            "note_hash",
        ],
    )

    start_time = time.time()
    logger.info(f"Refreshing {len(notes)} embeddings")
    if df.path_to_delete.any():
        to_delete = df.path_to_delete.apply(urllib.parse.quote).tolist()
        response = index.delete(ids=to_delete, namespace=namespace)
        logger.info(f"Deleted notes: {to_delete}")

    if not df.note_content.any():
        logger.info("No notes to index, exiting")
        return JSONResponse(status_code=200, content={"status": "success"})

    # add column "note_hash" based on "note_embedding_format"
    df.note_hash = df.note_embedding_format.apply(
        lambda x: hashlib.sha256(x.encode()).hexdigest()
    )

    df_length = len(df)

    # filter out notes that didn't change by checking their hash
    # in the index metadata
    ids_to_fetch = df.note_path.apply(urllib.parse.quote).tolist()
    # split in chunks of n because fetch has a limit of size
    n = 200
    ids_to_fetch = [ids_to_fetch[i : i + n] for i in range(0, len(ids_to_fetch), n)]
    logger.info(f"Fetching {len(ids_to_fetch)} chunks of {n} ids")

    def _fetch(ids):
        try:
            return index.fetch(ids=ids, namespace=namespace)
        except Exception as e:
            logger.error(f"Error fetching {ids}: {e}", exc_info=True)
            raise e

    with ThreadPool(len(ids_to_fetch)) as pool:
        existing_documents = pool.map(lambda n: _fetch(n), ids_to_fetch)
    # flatten vectors.values()
    flat_existing_documents = itertools.chain.from_iterable(
        [doc.vectors.values() for doc in existing_documents]
    )

    # TODO: might do also with https://docs.pinecone.io/docs/metadata-filtering#querying-an-index-with-metadata-filters

    # remove rows that have the same hash
    existing_hashes = []
    exisiting_contents = []
    for doc in flat_existing_documents:
        existing_hashes.append(doc.get("metadata", {}).get("note_hash"))
        exisiting_contents.append(doc.get("metadata", {}).get("note_content"))
    df = df[
        ~df.apply(
            lambda x: x.note_hash in existing_hashes,
            axis=1,
        )
    ]
    threshold_similarity = 0.7
    # count rows that didn't change too much using string similarity on note content embedding format
    try:
        didnt_change = df.apply(
            lambda x: any(
                string_similarity(x.note_content, exisiting_content)
                > threshold_similarity
                for exisiting_content in exisiting_contents
            ),
            axis=1,
        )
        sum_didnt_change = len(df[didnt_change])
        logger.info(f"There are {sum_didnt_change} notes that didn't change too much")
    except:
        pass

    diff = df_length - len(df)

    logger.info(f"Filtered out {diff} notes that didn't change at all")

    if not df.note_content.any():
        logger.info("No notes to index found after filtering existing ones, exiting")
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "ignored_notes_hash": existing_hashes,
            },
        )

    # parallelize
    response = embed(df.note_embedding_format.tolist(), settings.model)
    df.note_embedding = [e["embedding"] for e in response]

    # TODO average the embeddings over "embedding" column grouped by index, merge back into df
    # s = (
    #     df.apply(lambda x: pd.Series(x["note_embedding"]), axis=1)
    #     .groupby(level=0)
    #     .mean()
    #     .reset_index()
    #     .drop("index", axis=1)
    # )
    # # merge s column into a single column , ignore index
    # df.note_embedding = s.apply(lambda x: x.tolist(), axis=1)
    # TODO: problem is that pinecone doesn't support this large of an input
    upload_embeddings_to_vector_database(df, namespace)

    logger.info(f"Indexed & uploaded {len(df)} sentences")
    end_time = time.time()
    logger.info(f"Indexed & uploaded in {end_time - start_time} seconds")

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "success",
            "ignored_notes_hash": existing_hashes,
        },
    )


@app.post("/v1/search")
def semantic_search(
    request: Request, request_body: SearchRequest, _: Settings = Depends(get_settings)
):
    """
    Search for a given query in the corpus
    """
    # either note or query is present in the request
    if not request_body.note and not request_body.query:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "error",
                "message": "Please provide a query or a note.",
            },
        )
    query = request_body.query or note_to_embedding_format(
        request_body.note.note_path,
        request_body.note.note_tags,
        request_body.note.note_content,
    )
    namespace = get_namespace(request, request_body)
    sentry_sdk.set_user({"id": request_body.vault_id})

    top_k = 5  # TODO might fail if index empty?
    if request_body.top_k > 0:
        top_k = request_body.top_k
    query_embedding = no_batch_embed(query)

    logger.info(f"Query {request_body.query} created embedding, querying index")

    query_response = index.query(
        top_k=top_k,
        include_values=True,
        include_metadata=True,
        vector=query_embedding,
        namespace=namespace,
        # if metadata is present in the request, filter by it
        filter={"note_ner_word": {"$in": request_body.metadata.get("persons", "%")}}
        if request_body.metadata
        else {},
    )

    similarities = []
    for match in query_response.matches:
        logger.debug(f"Match id: {match.id}")
        decoded_path = urllib.parse.unquote(match.id)
        logger.debug(f"Decoded path: {decoded_path}")
        similarities.append(
            {
                "score": match.score,
                "note_name": decoded_path.split("/")[-1],
                "note_path": decoded_path,
                "note_content": match.metadata["note_content"],
                "note_tags": match.metadata["note_tags"],
                "note_ner_entity_group": match.metadata.get(
                    "note_ner_entity_group", []
                ),
                # convert to list of numbers ("[1,2,3]" -> [1,2,3])
                "note_ner_score": json.loads(
                    match.metadata.get("note_ner_score", "[]")
                ),
                "note_ner_word": match.metadata.get("note_ner_word", []),
                "note_ner_start": json.loads(
                    match.metadata.get("note_ner_start", "[]")
                ),
                "note_ner_end": json.loads(match.metadata.get("note_ner_end", "[]")),
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
        "http://0.0.0.0:8080/v1/search/refresh",
        json={
            "vault_id": "test",
            "notes": [],
        },
        headers={
            "Authorization": "Bearer local",
        },
    )
    r.raise_for_status()
    logger.info("Health check successful")

    return JSONResponse(
        status_code=200,
        content={"status": "success"},
    )
