from typing import Any, Dict, List, Optional, Union

Fetch = Any

class BatchAddDocument:
    data: str
    metadata: Optional[Dict[str, Any]]

class Metadata:
    path: Optional[str]

    def __getitem__(self, key: str) -> Any:
        return self.__dict__.get(key)

    def __setitem__(self, key: str, value: Any) -> None:
        setattr(self, key, value)

class SearchSimilarity:
    similarity: float
    data: str
    embedding: List[float]
    hash: str
    metadata: Optional[Metadata]

class SearchData:
    query: str
    similarities: List[SearchSimilarity]

class SearchOptions:
    limit: Optional[int]

class AddDataResult:
    id: str
    data: str
    embedding: List[float]
    hash: str
    metadata: Optional[Metadata]

class AddData:
    results: Optional[List[AddDataResult]]
    error: Optional[str]

ClientContextData = List[str]
ClientSearchData = List[SearchSimilarity]
ClientAddData = Dict[str, Union[str, str]]
ClientDatasets = Dict[str, Union[str, int]]
