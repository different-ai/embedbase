import requests
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass

@dataclass
class SearchResult:
    score: float
    id: str
    data: str
    hash: str
    embedding: List[float]
    metadata: Optional[Dict[str, Any]]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SearchResult':
        return cls(
            score=data['score'],
            id=data['id'],
            data=data['data'],
            hash=data['hash'],
            embedding=data['embedding'],
            metadata=data['metadata']
        )


@dataclass
class Dataset:
    client: 'EmbedbaseClient'
    dataset: str

    def search(self, query: str, limit: Optional[int] = None) -> List[SearchResult]:
        return self.client.search(self.dataset, query, limit)

    def add(self, document: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Union[str, int]]:
        return self.client.add(self.dataset, document, metadata)

    def batch_add(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Union[str, int]]]:
        return self.client.batch_add(self.dataset, documents)

    def create_context(self, query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        return self.client.create_context(self.dataset, query, limit)

    def clear(self) -> None:
        return self.client.clear(self.dataset)

class EmbedbaseClient:
    def __init__(self, embedbase_url: str = "https://api.embedbase.xyz", embedbase_key: Optional[str] = None):
        if not embedbase_url:
            raise ValueError("embedbase_url is required.")
        
        if embedbase_url == "https://api.embedbase.xyz" and not embedbase_key:
            raise ValueError("embedbase_key is required when using Embedbase Cloud.")
        
        self.embedbase_api_url = f"{embedbase_url.rstrip('/')}/v1"
        self.embedbase_api_key = embedbase_key
        self.headers = {'Content-Type': 'application/json'}
        if self.embedbase_api_key:
            self.headers['Authorization'] = f"Bearer {self.embedbase_api_key}"

    def create_context(self, dataset: str, query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        top_k = limit or 5
        search_url = f"{self.embedbase_api_url}/{dataset}/search"
        res = requests.post(search_url, headers=self.headers, json={"query": query, "top_k": top_k})
        res.raise_for_status()
        data = res.json()
        return [similarity["data"] for similarity in data["similarities"]]

    def search(self, dataset: str, query: str, limit: Optional[int] = None) -> List[SearchResult]:
        top_k = limit or 5
        search_url = f"{self.embedbase_api_url}/{dataset}/search"
        res = requests.post(search_url, headers=self.headers, json={"query": query, "top_k": top_k})
        res.raise_for_status()
        data = res.json()
        # pylint: disable=no-any-return
        return data["similarities"]

    def add(self, dataset: str, document: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Union[str, int]]:
        add_url = f"{self.embedbase_api_url}/{dataset}"
        res = requests.post(add_url, headers=self.headers, json={"documents": [{"data": document, "metadata": metadata}]})
        res.raise_for_status()
        data = res.json()
        return {"id": data["results"][0]["id"], "status": "error" if data.get("error") else "success"}

    def batch_add(self, dataset: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Union[str, int]]]:
        add_url = f"{self.embedbase_api_url}/{dataset}"
        res = requests.post(add_url, headers=self.headers, json={"documents": documents})
        res.raise_for_status()
        data = res.json()
        return [{"id": result["id"], "status": "error" if data.get("error") else "success"} for result in data["results"]]

    def clear(self, dataset: str) -> None:
        url = f"{self.embedbase_api_url}/{dataset}/clear"
        res = requests.get(url, headers=self.headers)
        res.raise_for_status()

    def dataset(self, dataset: str) -> Dataset:
        return Dataset(client=self, dataset=dataset)

    def datasets(self) -> List[Dict[str, Any]]:
        datasets_url = f"{self.embedbase_api_url}/datasets"
        res = requests.get(datasets_url, headers=self.headers)
        res.raise_for_status()
        data = res.json()
        return data["datasets"]
