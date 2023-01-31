from typing import List, Optional
from pydantic import BaseModel

# TODO: could use pandera lib
class Document(BaseModel):
    document_id: Optional[str] = None
    document_path: Optional[str] = None
    document_tags: Optional[List[str]] = None
    document_content: Optional[str] = None
    document_to_delete: Optional[str] = None
    document_embedding_format: Optional[str] = None


class BaseSearchRequest(BaseModel):
    vault_id: str


class SearchRefreshRequest(BaseSearchRequest):
    documents: List[Document] = []


class SearchRequest(BaseSearchRequest):
    vault_id: str
    query: Optional[str] = None
    document: Optional[Document] = None
    top_k: int = 6


class SearchClearRequest(BaseSearchRequest):
    pass
