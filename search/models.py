from typing import Any, List, Optional
from pydantic import BaseModel

class Document(BaseModel):
    id: Optional[str] = None
    # data can be
    # - a string - for example  "This is a document"
    # TODO: - an image as an array - for example [[1, 2, 3], [4, 5, 6]]
    # etc.
    data: Any


class AddRequest(BaseModel):
    documents: List[Document]

class DeleteRequest(BaseModel):
    ids: List[str]

class SearchRequest(BaseModel):
    query: str
    top_k: int = 6

