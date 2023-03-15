from enum import Enum
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


# an enum to pick from openai or cohere
class EmbeddingProvider(str, Enum):
    OPENAI = "openai"
    COHERE = "cohere"


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
    cohere_api_key: typing.Optional[str] = None
    embedding_provider: EmbeddingProvider = EmbeddingProvider.OPENAI


@lru_cache()
def get_settings():
    settings = Settings.parse_file(SECRET_PATH + "/config.yaml")

    if settings.embedding_provider != EmbeddingProvider.OPENAI:
        raise Exception(
            "Currently only openai is supported, "
            + "please create an issue if you want to use another provider "
            + "https://github.com/different-ai/embedbase/issues/new/choose"
        )

    if settings.vector_database != VectorDatabaseEnum.supabase:
        raise Exception(
            "Currently only supabase is supported, "
            + "please create an issue if you want to use another database "
            + "https://github.com/different-ai/embedbase/issues/new/choose"
        )

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
