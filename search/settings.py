from functools import lru_cache
import typing
import os
from pydantic import BaseSettings

SECRET_PATH = "/secrets" if os.path.exists("/secrets") else ".."
# if can't find .env in .. try . now (local dev)
if not os.path.exists(SECRET_PATH + "/.env"):
    SECRET_PATH = "."
class Settings(BaseSettings):
    pinecone_api_key: str
    openai_api_key: str
    openai_organization: str

    model: str = "text-embedding-ada-002"  # or "multi-qa-MiniLM-L6-cos-v1"
    embed_cache_size: typing.Optional[int] = None
    log_level: str = "INFO"
    device: str = "cpu"

    huggingface_inference_api_key: str

    class Config:
        env_file = SECRET_PATH + "/.env"


@lru_cache()
def get_settings():
    return Settings()