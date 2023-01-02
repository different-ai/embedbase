import time
from pandas import DataFrame
import torch
import os
from sentence_transformers import SentenceTransformer
from functools import lru_cache
import typing
import logging
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from models import Input, Notes
from pydantic import BaseSettings
from fastapi.responses import JSONResponse
import pinecone
import urllib.parse
from utils import BatchGenerator
import openai
import sentry_sdk
import posthog
from tenacity import retry
from tenacity.wait import wait_exponential
from tenacity.before import before_log


SECRET_PATH = "/secrets" if os.path.exists("/secrets") else "."
PORT = os.environ.get("PORT", 3333)


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


def is_openai_embedding_model(model: str) -> bool:
    return model.startswith("text-embedding-")


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
)
posthog.project_api_key = "phc_V6Q5EBJViMpMCsvZAwsiOnzLOSmr0cNGnv2Rw44sUn0"
posthog.host = "https://app.posthog.com"
posthog.debug = os.environ.get("ENVIRONMENT", "development") == "development"

app = FastAPI()

origins = ["app://obsidian.md", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = get_settings()
pinecone.init(api_key=settings.pinecone_api_key, environment="us-west1-gcp")
openai.api_key = settings.openai_api_key
openai.organization = settings.openai_organization
index = pinecone.Index("anotherai", pool_threads=8)
state = {"status": "loading", "model": None}
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
    logger.info(f"Using model {settings.model}")

    if not is_openai_embedding_model(settings.model):
        state["model"] = SentenceTransformer(settings.model, device=settings.device)
        # TODO cuda
        if torch.backends.mps.is_available() and torch.backends.mps.is_built():
            logger.info("Using MPS device")
            settings.device = "mps"
    state["status"] = "ready"


@lru_cache()
def no_batch_embed(sentence: str, _: Settings = Depends(get_settings)) -> torch.Tensor:
    """
    Compute the embedding for a given sentence
    """
    settings = get_settings()
    if is_openai_embedding_model(settings.model):
        return embed([sentence], settings.model)[0]["embedding"]

    return (
        state["model"]
        .encode(
            sentence,
            convert_to_tensor=True,
        )
        .tolist()
    )


@retry(
    wait=wait_exponential(multiplier=1, min=4, max=10),
    before=before_log(logger, logging.DEBUG),
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
    wait=wait_exponential(multiplier=1, min=4, max=10),
    before=before_log(logger, logging.DEBUG),
)
def upload_embeddings_to_vector_database(df: DataFrame, namespace: str):
    df_batcher = BatchGenerator(300)
    logger.info("Uploading vectors namespace..")
    start_time_upload = time.time()
    responses = []
    for batch_df in df_batcher(df):
        response = index.upsert(
            vectors=zip(
                # url encode path
                batch_df.note_path.apply(urllib.parse.quote).tolist(),
                # batch_df.note_path,
                batch_df.note_embedding,
                [
                    {"note_tags": tags, "note_content": content}
                    for tags, content in zip(batch_df.note_tags, batch_df.note_content)
                ],
            ),
            namespace=namespace,
            async_req=True,
        )
        responses.append(response)
        # https://docs.pinecone.io/docs/semantic-text-search#upload-vectors-of-titles

    # await all responses
    [async_result.get() for async_result in responses]
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
            if not note.note_content or len(note.note_content) < 1000
        ],
        columns=[
            "note_path",
            "note_tags",
            "note_content",
            "path_to_delete",
            "notes_embedding_format",
            "note_embedding",
        ],
    )

    start_time = time.time()
    logger.info(f"Refreshing {len(notes)} embeddings")
    if df.path_to_delete.any():
        to_delete = df.path_to_delete.apply(urllib.parse.quote).tolist()
        response = index.delete(ids=to_delete, namespace=request.namespace)
        logger.debug(f"Deleted notes: {to_delete}")

    if not df.note_content.any():
        logger.info("No notes to index, exiting")
        return JSONResponse(status_code=200, content={"status": "ok"})
    # add column "notes_embedding_format"
    df.notes_embedding_format = df.apply(
        lambda x: note_to_embedding_format(x.note_path, x.note_tags, x.note_content),
        axis=1,
    )

    if is_openai_embedding_model(settings.model):
        # parallelize
        response = embed(df.notes_embedding_format.tolist(), settings.model)
        df.note_embedding = [e["embedding"] for e in response]

    else:
        df.note_embedding = (
            state["model"]
            .encode(
                df.notes_embedding_format.tolist(),
                convert_to_tensor=True,
                show_progress_bar=True,
                batch_size=16,  # Seems to be optimal on my machine
            )
            .tolist()
        )
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
    upload_embeddings_to_vector_database(df, request.namespace)

    logger.info(f"Indexed & uploaded {len(notes)} sentences")
    end_time = time.time()
    logger.info(f"Indexed & uploaded in {end_time - start_time} seconds")

    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "success"})


# /semantic_search usage:
"""
URL="https://obsidian-search-dev-c6txy76x2q-uc.a.run.app"
curl -X POST -H "Content-Type: application/json" -d '{"namespace": "dev", "query": "Bob"}' $URL/semantic_search | jq '.'

"""


@app.post("/semantic_search")
def semantic_search(input: Input, _: Settings = Depends(get_settings)):
    """
    Search for a given query in the corpus
    """
    # either note or query is present in the request
    if not input.note and not input.query:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "error",
                "message": "Please provide a query or a note.",
            },
        )
    query = input.query or note_to_embedding_format(
        input.note.note_path,
        input.note.note_tags,
        input.note.note_content,
    )
    posthog.capture(
        input.namespace,
        "search",
        {
            "namespace": input.namespace,
            "query_length": len(query),
        },
    )


    top_k = min(input.top_k, 5)  # TODO might fail if index empty?

    # TODO: handle too large query (chunk -> average)
    # if len(query) > 1000:
    #     return JSONResponse(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         content={"status": "error", "message": "Query too large"},
    #     )
    query_embedding = no_batch_embed(query)

    query_response = index.query(
        top_k=top_k,
        include_values=True,
        include_metadata=True,
        vector=query_embedding,
        # filter={
        # "genre": {"$in": ["comedy", "documentary", "drama"]}
        # }
        namespace=input.namespace,
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
