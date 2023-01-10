import hashlib
from multiprocessing.pool import ThreadPool
import time
from pandas import DataFrame
import os
from functools import lru_cache
import itertools
import typing
import logging
from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from search.models import Input, Notes, Note
from pydantic import BaseSettings
from fastapi.responses import JSONResponse
import pinecone
import urllib.parse
import numpy as np
from search.pub_sub import enrich_doc
from .utils import BatchGenerator, too_big_rows
import openai
import sentry_sdk
import posthog
from tenacity import retry
from tenacity.wait import wait_exponential
from tenacity.before import before_log
from tenacity.after import after_log
from tenacity.stop import stop_after_attempt

SECRET_PATH = "/secrets" if os.path.exists("/secrets") else ".."
PORT = os.environ.get("PORT", 3333)
UPLOAD_BATCH_SIZE = int(os.environ.get("UPLOAD_BATCH_SIZE", "100"))


class Settings(BaseSettings):
    pinecone_api_key: str
    openai_api_key: str
    openai_organization: str

    model: str = "text-embedding-ada-002"  # or "multi-qa-MiniLM-L6-cos-v1"
    embed_cache_size: typing.Optional[int] = None
    log_level: str = "INFO"
    device: str = "cpu"

    class Config:
        env_file = SECRET_PATH + "/.env"


@lru_cache()
def get_settings():
    return Settings()


sentry_sdk.init(
    dsn="https://6b244f8db9db446b8c2deddfea43083e@o404046.ingest.sentry.io/4504407308697600",
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    # We recommend adjusting this value in production,
    traces_sample_rate=1.0,
    environment=os.environ.get("ENVIRONMENT", "development"),
    _experiments={
        "profiles_sample_rate": 1.0,
    },
)
posthog.project_api_key = "phc_8Up1eqqTpl4m2rMXePkHXouFXzihTCswZ27QPgmhjmM"
posthog.host = "https://app.posthog.com"
posthog.debug = os.environ.get("ENVIRONMENT", "development") == "development"
VERSION = os.environ.get("SENTRY_RELEASE", "unknown")

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = get_settings()
pinecone.init(api_key=settings.pinecone_api_key, environment="us-west1-gcp")
openai.api_key = settings.openai_api_key
openai.organization = settings.openai_organization
index = pinecone.Index("anotherai", pool_threads=8)
state = {"status": "loading"}
logger = logging.getLogger("search")
logger.setLevel(settings.log_level)
handler = logging.StreamHandler()
handler.setLevel(settings.log_level)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)


def note_to_embedding_format(
    note_path: str, note_tags: typing.List[str], note_content: str
) -> str:
    """
    Convert a note to the format expected by the embedding model
    """
    return f"File:\n{note_path}\nTags:\n{note_tags}\nContent:\n{note_content}"


@app.on_event("startup")
def startup_event():
    result = index.fetch(ids=["foo"])  # TODO: container startup check
    if result:
        logger.info("Properly connected to Pinecone")
    else:
        logger.error("Could not connect to Pinecone")
    logger.info(f"Detected an upload batch size of {UPLOAD_BATCH_SIZE}")
    logger.info(f"Starting version {VERSION}")
    state["status"] = "ready"


@lru_cache()
def no_batch_embed(sentence: str, _: Settings = Depends(get_settings)):
    """
    Compute the embedding for a given sentence
    """
    settings = get_settings()
    # TODO: split large sentences in chunks and average the embeddings
    chunks = [sentence]
    if len(sentence) > 2000:
        chunks = [sentence[i : i + 2000] for i in range(0, len(sentence), 2000)]
    embeddings = embed(chunks, settings.model)
    if len(chunks) > 1:
        return np.mean([e["embedding"] for e in embeddings], axis=0).tolist()
    return embeddings[0]["embedding"]


@retry(
    wait=wait_exponential(multiplier=1, min=1, max=3),
    before=before_log(logger, logging.DEBUG),
    after=after_log(logger, logging.DEBUG),
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
    after=after_log(logger, logging.INFO),
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


"""
URL="https://obsidian-search-dev-c6txy76x2q-uc.a.run.app"
# insert
curl -X POST -H "Content-Type: application/json" -d '{"namespace": "dev", "notes": [{"note_path": "Bob.md", "note_tags": ["Humans", "Bob"], "note_content": "Bob is a human"}]}' $URL/refresh | jq '.'

# delete
curl -X POST -H "Content-Type: application/json" -d '{"namespace": "dev", "notes": [{"path_to_delete": "Bob.md"}]}' $URL/refresh | jq '.'

# rename
curl -X POST -H "Content-Type: application/json" -d '{"namespace": "dev", "notes": [{"path_to_delete": "Bob.md", "note_path": "Bob3.md", "note_tags": ["Humans", "Bob"], "note_content": "Bob is a human"}]}' $URL/refresh | jq '.'

# clear
curl -X POST -H "Content-Type: application/json" -d '{"namespace": "dev", "clear": true}' $URL/refresh | jq '.'

"""

MAX_NOTE_LENGTH = int(os.environ.get("MAX_NOTE_LENGTH", "1000"))


@app.post("/refresh")
def refresh(request: Notes, _: Settings = Depends(get_settings)):
    """
    Refresh the embeddings for a given file
    """
    posthog.capture(
        request.namespace,
        "refresh",
        {
            "namespace": request.namespace,
            "notes_length": len(request.notes),
            "clear": request.clear,
        },
    )
    sentry_sdk.set_user(
        {
            "id": request.namespace.split("/")[0]
            if request.namespace and len(request.namespace.split("/")) > 0
            else "unknown"
        }
    )
    print(request)
    if request.clear:
        # clear index
        index.delete(delete_all=True, namespace=request.namespace)
        logger.info("Cleared index")
        return JSONResponse(status_code=200, content={"status": "ok"})

    notes = request.notes
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
        response = index.delete(ids=to_delete, namespace=request.namespace)
        logger.info(f"Deleted notes: {to_delete}")

    if not df.note_content.any():
        logger.info("No notes to index, exiting")
        print(df.note_content)
        return JSONResponse(status_code=200, content={"status": "ok"})

    # add column "note_embedding_format"
    df.note_embedding_format = df.apply(
        lambda x: note_to_embedding_format(x.note_path, x.note_tags, x.note_content),
        axis=1,
    )
    # add column "note_hash" based on "note_embedding_format"
    df.note_hash = df.note_embedding_format.apply(
        lambda x: hashlib.sha256(x.encode()).hexdigest()
    )

    df_length = len(df)

    # filter out notes that didn't change by checking their hash
    # in the index metadata
    ids_to_fetch = df.note_path.apply(urllib.parse.quote).tolist()
    # split in chunks of n because fetch has a limit of size
    n = 500
    ids_to_fetch = [ids_to_fetch[i : i + n] for i in range(0, len(ids_to_fetch), n)]
    with ThreadPool(len(ids_to_fetch)) as pool:
        existing_documents = pool.map(
            lambda n: index.fetch(ids=n, namespace=request.namespace), ids_to_fetch
        )
    # flatten vectors.values()
    flat_existing_documents = itertools.chain.from_iterable(
        [doc.vectors.values() for doc in existing_documents]
    )

    # TODO: might do also with https://docs.pinecone.io/docs/metadata-filtering#querying-an-index-with-metadata-filters

    # remove rows that have the same hash
    df = df[
        ~df.apply(
            lambda x: x.note_hash
            in [
                doc.get("metadata", {}).get("note_hash")
                for doc in flat_existing_documents
            ],
            axis=1,
        )
    ]

    diff = df_length - len(df)

    logger.info(f"Filtered out {diff} notes that didn't change")

    posthog.capture(
        request.namespace,
        "refresh_filtered",
        {
            "namespace": request.namespace,
            "notes_length": len(request.notes),
            "clear": request.clear,
            "filtered": diff,
        },
    )

    if not df.note_content.any():
        logger.info("No notes to index found after filtering existing ones, exiting")
        print(df.note_content)
        return JSONResponse(status_code=200, content={"status": "ok"})

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
    upload_embeddings_to_vector_database(df, request.namespace)

    logger.info(f"Indexed & uploaded {len(df)} sentences")
    end_time = time.time()
    logger.info(f"Indexed & uploaded in {end_time - start_time} seconds")

    try:
        enrich_doc(df.note_path.apply(urllib.parse.quote).tolist(), request.namespace)
        logger.info(f"Enqueued {len(notes)} notes for enrichment")
    except Exception as e:
        logger.warning(f"Failed to enqueue notes for enrichment: {e}")

    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "success"})


# /semantic_search usage:
"""
URL="https://obsidian-search-dev-c6txy76x2q-uc.a.run.app"
curl -X POST -H "Content-Type: application/json" -d '{"namespace": "dev", "query": "Bob"}' $URL/semantic_search | jq '.'

"""


@app.post("/semantic_search")
def semantic_search(request: Input, _: Settings = Depends(get_settings)):
    """
    Search for a given query in the corpus
    """
    # either note or query is present in the request
    if not request.note and not request.query:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "error",
                "message": "Please provide a query or a note.",
            },
        )
    query = request.query or note_to_embedding_format(
        request.note.note_path,
        request.note.note_tags,
        request.note.note_content,
    )
    posthog.capture(
        request.namespace,
        "search",
        {
            "namespace": request.namespace,
            "query_length": len(query),
        },
    )
    sentry_sdk.set_user(
        {
            "id": request.namespace.split("/")[0]
            if request.namespace and len(request.namespace.split("/")) > 0
            else "unknown"
        }
    )

    top_k = min(request.top_k, 5)  # TODO might fail if index empty?

    query_embedding = no_batch_embed(query)

    logger.info(f"Query {request.query} created embedding, querying index")

    query_response = index.query(
        top_k=top_k,
        include_values=True,
        include_metadata=True,
        vector=query_embedding,
        namespace=request.namespace,
    )

    # TODO: maybe advanced query language like elasticsearch + semantic query
    # TODO: i.e. if I want to search over tags + semantic?

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
    # TODO BROKEN
    # response = requests.post(
    #     f"http://localhost:{PORT}/refresh",
    #     json={"notes": [{"namespace": "health-check", "note_path": "Bob.md", "note_tags": ["Humans", "Bob"], "note_content": "Bob is a human"}]},
    # )
    # if response.status_code != 200:
    #     raise HTTPException(
    #         status_code=response.status_code, detail="Health check failed"
    #     )
    return JSONResponse(
        status_code=200,
        content={"status": "success"},
    )
