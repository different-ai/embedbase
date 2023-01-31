from functools import lru_cache
import typing
import os
from pydantic import BaseSettings, validator
from pydantic_yaml import YamlStrEnum, YamlModel

SECRET_PATH = "/secrets" if os.path.exists("/secrets") else ".."
# if can't find .env in .. try . now (local dev)
if not os.path.exists(SECRET_PATH + "/config.yaml"):
    SECRET_PATH = "."

if not os.path.exists(SECRET_PATH + "/config.yaml"):
    # exit process with error
    print("ERROR: Missing config.yaml file")

class HistoryMiddlewareAuthEnum(YamlStrEnum):
    firebase = "firebase"
    # TODO
    # ip = "ip"
    # jwt = "jwt"
    # session = "session"


class HistoryMiddlewareBackendnum(YamlStrEnum):
    firestore = "firestore"


class HistoryMiddleware(YamlModel):
    auth: HistoryMiddlewareAuthEnum = "firebase"
    backend: HistoryMiddlewareBackendnum = "firestore"

class Middlewares(YamlModel):
    history: typing.Optional[HistoryMiddleware] = None

class Settings(YamlModel):
    pinecone_api_key: str
    pinecone_index: str
    pinecone_environment: str
    openai_api_key: str
    openai_organization: str
    model: str = "text-embedding-ada-002"
    embed_cache_size: typing.Optional[int] = None
    log_level: str = "INFO"
    middlewares: typing.Optional[Middlewares] = None
    sentry: typing.Optional[str] = None

    # @validator("middlewares")
    # def _chk_middlewares(cls, v: typing.List[Middleware]) -> int:  # noqa
    #     # check that no middleware is defined twice
    #     # e.g. no duplicate of the same class
    #     types = [type(m) for m in v]
    #     if len(types) != len(set(types)):
    #         raise ValueError(f"Duplicate middleware definition: {v}")


@lru_cache()
def get_settings():
    return Settings.parse_file(SECRET_PATH + "/config.yaml")
