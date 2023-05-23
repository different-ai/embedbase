from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Extra


class Metadata(BaseModel):
    path: Optional[str]

    def __getitem__(self, key: str) -> Any:
        return self.__dict__.get(key)

    def __setitem__(self, key: str, value: Any) -> None:
        setattr(self, key, value)

    # unlock "baz" in my_metadata
    def __contains__(self, key: str) -> bool:
        return key in self.__dict__

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

    # HACK to have Document(metadata={"path": "foo", "bar": "baz"}) ->
    #   Document(id=None, data=None, hash=None, embedding=None, metadata=Metadata(path='foo', bar='baz'))
    # instead of
    #   Document(id=None, data=None, hash=None, embedding=None, metadata=Metadata(path='foo'))
    class Config:
        extra = Extra.allow


class Document(BaseModel):
    id: Optional[str]
    data: Optional[str]
    hash: Optional[str]
    embedding: Optional[List[float]]
    metadata: Optional[Metadata]


class ClientDatasets:
    dataset_id: str
    documents_count: int


class ClientAddData(BaseModel):
    id: Optional[str]
    status: str


class BatchAddDocument(BaseModel):
    data: str
    metadata: Optional[Dict[str, Any]]


class SearchSimilarity(Document):
    similarity: float


class SearchData(BaseModel):
    query: str
    similarities: List[SearchSimilarity]


class SearchOptions(BaseModel):
    limit: Optional[int]


class AddDataResult(Document):
    pass


class AddData(BaseModel):
    results: Optional[List[AddDataResult]]
    error: Optional[str]



class Chat(BaseModel):
    role: str
    content: str


class GenerateOptions(BaseModel):
    history: List[Chat]
