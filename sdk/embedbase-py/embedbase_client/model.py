from typing import Any, Dict, List, Optional, Union

from dataclasses import dataclass

import httpx
import requests

@dataclass
class SearchResult:
    score: float
    id: str
    data: str
    hash: str
    embedding: List[float]
    metadata: Optional[Dict[str, Any]]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SearchResult":
        return cls(
            score=data["score"],
            id=data["id"],
            data=data["data"],
            hash=data["hash"],
            embedding=data["embedding"],
            metadata=data["metadata"],
        )


@dataclass
class ClientDatasets:
    dataset_id: str
    documents_count: int


@dataclass
class ClientAddData:
    id: Optional[str]
    status: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ClientAddData":
        return cls(
            id=data.get("id"),
            status=data["status"],
        )