from typing import List, Optional
from pydantic import BaseModel

# TODO: response models once stable

class Document(BaseModel):
    # data can be
    # - a string - for example  "This is a document"
    # TODO: currently only string is supported (later could be images, audio, multi/cross-modal)
    # etc.
    data: str
    metadata: Optional[dict]


class AddRequest(BaseModel):
    documents: List[Document]
    store_data: bool = True

class UpdateDocument(BaseModel):
    id: str
    data: Optional[str] = None
    metadata: Optional[dict] = None

class UpdateRequest(BaseModel):
    documents: List[UpdateDocument]

class DeleteRequest(BaseModel):
    ids: List[str]


class SearchRequest(BaseModel):
    query: str
    top_k: int = 6
