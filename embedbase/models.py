from typing import List, Optional, Union

from pydantic import BaseModel, validator


class Document(BaseModel):
    id: str
    data: Optional[str]
    hash: str
    embedding: Union[List[float], str]
    metadata: Optional[dict]
    dataset_ids: List[str] = []


class AddDocument(BaseModel):
    # data can be
    # - a string - for example  "This is a document"
    # TODO: currently only string is supported (later could be images, audio, multi/cross-modal)
    # etc.
    data: str
    metadata: Optional[dict]

    @validator("data")
    def data_must_not_be_empty(cls, v):
        assert v != "", "data must not be empty"
        return v


class AddRequest(BaseModel):
    documents: List[AddDocument]
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
    # todo add validation on metdata (create Metdata class as in sdk-py)
    where: Optional[Union[dict, List[dict]]] = None


class ReplaceDocument(BaseModel):
    data: str = None
    metadata: Optional[dict] = None


class ReplaceRequest(BaseModel):
    documents: List[ReplaceDocument]
    # todo add validation on metdata (create Metdata class as in sdk-py)
    where: Optional[Union[dict, List[dict]]] = None
