from typing import Optional

from abc import ABC


class BaseClient(ABC):
    def __init__(
        self,
        embedbase_url: str = "https://api.embedbase.xyz",
        embedbase_key: Optional[str] = None,
        timeout: Optional[float] = 30,
    ):
        if not embedbase_url:
            raise ValueError("embedbase_url is required.")

        if embedbase_url == "https://api.embedbase.xyz" and not embedbase_key:
            raise ValueError("embedbase_key is required when using Embedbase Cloud.")

        self.embedbase_url = embedbase_url.rstrip("/") + "/v1"
        self.embedbase_api_key = embedbase_key
        self.headers = {"Content-Type": "application/json"}
        if self.embedbase_api_key:
            self.headers["Authorization"] = f"Bearer {self.embedbase_api_key}"
        self.timeout = timeout
