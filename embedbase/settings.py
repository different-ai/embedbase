from enum import Enum
from functools import lru_cache
import typing
import os
from pydantic import BaseModel
from pydantic_yaml import parse_yaml_file_as


class VectorDatabaseEnum(str, Enum):
    pinecone = "pinecone"
    supabase = "supabase"
    weaviate = "weaviate"
    postgres = "postgres"


# an enum to pick from openai or cohere
class EmbeddingProvider(str, Enum):
    OPENAI = "openai"
    COHERE = "cohere"


class Settings(BaseModel):
    openai_api_key: typing.Optional[str] = None
    openai_organization: typing.Optional[str] = None
    supabase_url: typing.Optional[str] = None
    supabase_key: typing.Optional[str] = None
    
    log_level: str = "INFO"
    auth: typing.Optional[str] = None
    firebase_service_account_path: typing.Optional[str] = None

@lru_cache()
def get_settings_from_file(path: str = "config.yaml"):
    """
    Read settings from a file, only supports yaml for now
    """
    settings = parse_yaml_file_as(Settings, path)

    # TODO: move
    # if firebase, init firebase
    if settings.auth and settings.auth == "firebase":
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(settings.firebase_service_account_path)
        firebase_admin.initialize_app(cred)
    return settings
