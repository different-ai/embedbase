from typing import List, Optional
from pydantic import BaseModel

# TODO: could use pandera lib
class Note(BaseModel):
    note_path: Optional[str] = None
    note_tags: Optional[List[str]] = None
    note_content: Optional[str] = None
    path_to_delete: Optional[str] = None
    note_embedding_format: Optional[str] = None

class BaseSearchRequest(BaseModel):
    vault_id: str

class SearchRefreshRequest(BaseSearchRequest):
    notes: List[Note] = []

class SearchRequest(BaseSearchRequest):
    vault_id: str
    query: Optional[str] = None
    note: Optional[Note] = None
    top_k: int = 6
    # example: {"person": "John Doe"}
    metadata: Optional[dict] = None

class SearchClearRequest(BaseSearchRequest):
    pass