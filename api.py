import time
from pandas import DataFrame
import torch
import os
from sentence_transformers import SentenceTransformer
from functools import lru_cache
import typing
import logging
from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from models import Input, Notes
from pydantic import BaseSettings
from fastapi.responses import JSONResponse
import pinecone
import urllib.parse
from utils import BatchGenerator
import openai

SECRET_PATH = "/secrets" if os.path.exists("/secrets") else "."


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
state = {"status": "loading", "model": None, "logger": None}


def note_to_embedding_format(
    note_path: str, note_tags: typing.List[str], note_content: str
) -> str:
    """
    Convert a note to the format expected by the embedding model
    """
    return f"File:\n{note_path}\nTags:\n{note_tags}\nContent:\n{note_content}"


@app.on_event("startup")
def startup_event():
    logger = logging.getLogger("search")
    logger.setLevel(settings.log_level)
    handler = logging.StreamHandler()
    handler.setLevel(settings.log_level)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    state["logger"] = logger
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
        return openai.Embedding.create(input=[sentence], model=settings.model)["data"][
            0
        ]["embedding"]

    return (
        state["model"]
        .encode(
            sentence,
            convert_to_tensor=True,
        )
        .tolist()
    )


# curl -X POST -H "Content-Type: application/json" -d '{"notes": [{"note_path": "Bob.md", "note_tags": ["Humans", "Bob"], "note_content": "Bob is a human"}]}' http://localhost:3333/refresh | jq '.'


@app.post("/refresh")
def refresh(request: Notes, _: Settings = Depends(get_settings)):
    """
    Refresh the embeddings for a given file
    """
    notes = request.notes
    # TODO: temporarily we ignore too big notes because pinecone doesn't support them
    df = DataFrame(
        [note.dict() for note in notes if len(note.note_content) < 2000],
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
    state["logger"].info(f"Refreshing {len(notes)} embeddings")
    if "path_to_delete" in df.columns and df.path_to_delete.any():
        response = index.delete(
            ids=df.path_to_delete.tolist(), namespace=request.namespace
        )
        state["logger"].debug(response)
    # add column "notes_embedding_format"
    df.notes_embedding_format = df.apply(
        lambda x: note_to_embedding_format(x.note_path, x.note_tags, x.note_content),
        axis=1,
    )

    if is_openai_embedding_model(settings.model):
        # parallelize
        response = openai.Embedding.create(
            input=df.notes_embedding_format.tolist(), model=settings.model
        )["data"]
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

    df_batcher = BatchGenerator(300)
    state["logger"].info("Uploading vectors namespace..")
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
            namespace=request.namespace,
            async_req=True,
        )
        responses.append(response)
        # https://docs.pinecone.io/docs/semantic-text-search#upload-vectors-of-titles

    # await all responses
    [async_result.get() for async_result in responses]
    state["logger"].info(f"Uploaded in {time.time() - start_time_upload} seconds")
    state["logger"].info(f"Indexed & uploaded {len(notes)} sentences")
    end_time = time.time()
    state["logger"].info(f"Indexed & uploaded in {end_time - start_time} seconds")

    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "success"})


# /semantic_search usage:
# curl -X POST -H "Content-Type: application/json" -d '{"query": "Bob"}' http://localhost:3333/semantic_search | jq '.'


@app.post("/semantic_search")
def semantic_search(input: Input, _: Settings = Depends(get_settings)):
    """
    Search for a given query in the corpus
    """
    query = input.query
    top_k = min(input.top_k, 5)  # TODO might fail if index empty?

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

    state["logger"].info(f"Query: {query}")
    state["logger"].info(f"Response: {query_response}")
    # TODO: maybe advanced query language like elasticsearch + semantic query
    # TODO: i.e. if I want to search over tags + semantic?

    similarities = []
    for match in query_response.matches:
        decoded_path = urllib.parse.unquote(match.id)
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
    return JSONResponse(
        status_code=status.HTTP_200_OK, content={"status": state["status"]}
    )
