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


class DeleteRequest(BaseModel):
    ids: List[str]


class SearchRequest(BaseModel):
    query: str
    top_k: int = 6

class CrossSearchRequest(BaseModel):
    query: str
    dataset_ids: List[str]
    top_k: int = 6
