from enum import Enum
from functools import lru_cache
import typing
import os
from pydantic_yaml import YamlModel

SECRET_PATH = "/secrets" if os.path.exists("/secrets") else ".."
# if can't find config.yaml in .. try . now (local dev)
if not os.path.exists(SECRET_PATH + "/config.yaml"):
    SECRET_PATH = "."

if not os.path.exists(SECRET_PATH + "/config.yaml"):
    # exit process with error
    print("ERROR: Missing config.yaml file")

# an enum to pick from either pinecone, weaviate, or supabase
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
    save_clear_data: bool = True
    supabase_url: typing.Optional[str] = None
    supabase_key: typing.Optional[str] = None


@lru_cache()
def get_settings():
    settings = Settings.parse_file(SECRET_PATH + "/config.yaml")
    # if firebase, init firebase
    if settings.auth and settings.auth == "firebase":
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(settings.firebase_service_account_path)
        firebase_admin.initialize_app(cred)
    return settings
