# type: ignore[attr-defined]

from importlib import metadata as importlib_metadata


def get_version() -> str:
    try:
        return importlib_metadata.version(__name__)
    except importlib_metadata.PackageNotFoundError:  # pragma: no cover
        return "unknown"


version: str = get_version()

from .async_client import EmbedbaseAsyncClient
from .sync_client import EmbedbaseClient
