from typing import Any, Dict, List, Optional, Union

import asyncio
from dataclasses import dataclass

import httpx


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
class Dataset:
    client: "EmbedbaseClient"
    dataset: str

    def search(self, query: str, limit: Optional[int] = None) -> List[SearchResult]:
        return self.client.search(self.dataset, query, limit)

    def add(
        self, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Union[str, int]]:
        return self.client.add(self.dataset, document, metadata)

    def batch_add(
        self, documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Union[str, int]]]:
        return self.client.batch_add(self.dataset, documents)

    def create_context(
        self, query: str, limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        return self.client.create_context(self.dataset, query, limit)

    def clear(self) -> None:
        return self.client.clear(self.dataset)


class BaseClient:
    def __init__(
        self,
        embedbase_url: str = "https://api.embedbase.xyz",
        embedbase_key: Optional[str] = None,
        fastapi_app: Optional[Any] = None,
    ):
        if not embedbase_url:
            raise ValueError("embedbase_url is required.")

        if embedbase_url == "https://api.embedbase.xyz" and not embedbase_key:
            raise ValueError("embedbase_key is required when using Embedbase Cloud.")

        self.embedbase_url = embedbase_url.rstrip("/")
        self.embedbase_api_key = embedbase_key
        self.fastapi_app = fastapi_app
        self.headers = {"Content-Type": "application/json"}
        if self.embedbase_api_key:
            self.headers["Authorization"] = f"Bearer {self.embedbase_api_key}"


class EmbedbaseClient(BaseClient):
    def __init__(
        self,
        embedbase_url: str = "https://api.embedbase.xyz",
        embedbase_key: Optional[str] = None,
        fastapi_app: Optional[Any] = None,
    ):
        super().__init__(embedbase_url, embedbase_key)
        self._async_client = EmbedbaseAsyncClient(
            embedbase_url, embedbase_key, fastapi_app
        )

    def _run_async(self, coroutine):
        return asyncio.run(coroutine)

    def create_context(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        return self._run_async(self._async_client.create_context(dataset, query, limit))

    def search(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[SearchResult]:
        return self._run_async(self._async_client.search(dataset, query, limit))

    def add(
        self, dataset: str, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Union[str, int]]:
        return self._run_async(self._async_client.add(dataset, document, metadata))

    def batch_add(
        self, dataset: str, documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Union[str, int]]]:
        return self._run_async(self._async_client.batch_add(dataset, documents))

    def clear(self, dataset: str) -> None:
        return self._run_async(self._async_client.clear(dataset))

    def dataset(self, dataset: str) -> Dataset:
        return Dataset(client=self, dataset=dataset)

    def datasets(self) -> List[Dict[str, Any]]:
        return self._run_async(self._async_client.datasets())


@dataclass
class AsyncDataset:
    client: "EmbedbaseAsyncClient"
    dataset: str

    async def search(
        self, query: str, limit: Optional[int] = None
    ) -> List[SearchResult]:
        return await self.client.search(self.dataset, query, limit)

    async def add(
        self, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Union[str, int]]:
        return await self.client.add(self.dataset, document, metadata)

    async def batch_add(
        self, documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Union[str, int]]]:
        return await self.client.batch_add(self.dataset, documents)

    async def create_context(
        self, query: str, limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        return await self.client.create_context(self.dataset, query, limit)

    async def clear(self) -> None:
        return await self.client.clear(self.dataset)


class EmbedbaseAsyncClient(BaseClient):
    def dataset(self, dataset: str) -> AsyncDataset:
        return AsyncDataset(client=self, dataset=dataset)

    async def create_context(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        top_k = limit or 5
        search_url = f"/v1/{dataset}/search"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                search_url, headers=self.headers, json={"query": query, "top_k": top_k}
            )
        res.raise_for_status()
        data = res.json()
        return [similarity["data"] for similarity in data["similarities"]]

    async def search(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[SearchResult]:
        top_k = limit or 5
        search_url = f"/v1/{dataset}/search"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                search_url, headers=self.headers, json={"query": query, "top_k": top_k}
            )
        res.raise_for_status()
        data = res.json()
        return [SearchResult(**similarity) for similarity in data["similarities"]]

    async def add(
        self, dataset: str, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Union[str, int]]:
        add_url = f"/v1/{dataset}"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                add_url,
                headers=self.headers,
                json={"documents": [{"data": document, "metadata": metadata}]},
            )
        res.raise_for_status()
        data = res.json()
        return {
            "id": data["results"][0]["id"],
            "status": "error" if data.get("error") else "success",
        }

    async def batch_add(
        self, dataset: str, documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Union[str, int]]]:
        add_url = f"/v1/{dataset}"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                add_url, headers=self.headers, json={"documents": documents}
            )
        res.raise_for_status()
        data = res.json()
        return [
            {"id": result["id"], "status": "error" if data.get("error") else "success"}
            for result in data["results"]
        ]

    async def clear(self, dataset: str) -> None:
        url = f"/v1/{dataset}/clear"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.get(url, headers=self.headers)
        res.raise_for_status()

    async def datasets(self) -> List[Dict[str, Any]]:
        datasets_url = "/v1/datasets"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.get(datasets_url, headers=self.headers)
        res.raise_for_status()
        data = res.json()
        return data["datasets"]
