from typing import Any, Dict, List, Optional

from dataclasses import dataclass

import httpx
import requests
from embedbase_client.model import ClientAddData, ClientDatasets, SearchResult


class SearchBuilder:
    def __init__(self, client, dataset: str, query: str, options: Optional[Dict[str, Any]] = None):
        if options is None:
            options = {}
        self.client = client
        self.dataset = dataset
        self.query = query
        self.options = options

    def get(self) -> List[SearchResult]:
        return self.search()

    def search(self) -> "SearchBuilder":
        top_k = self.options.get("limit", None) or 5
        search_url = f"{self.client.embedbase_url}/{self.dataset}/search"

        request_body = {"query": self.query, "top_k": top_k}

        if "where" in self.options:
            request_body["where"] = self.options["where"]

        headers = self.client.headers
        res = requests.post(search_url, headers=headers, json=request_body)
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()

        return [SearchResult(**result) for result in data["similarities"]]

    def where(self, field: str, operator: str, value: Any) -> "SearchBuilder":
        # self.options["where"] = {field: {operator: value}}
        self.options["where"] = {}
        self.options["where"][field] = value
        return self


@dataclass
class Dataset:
    client: "EmbedbaseClient"
    dataset: str

    def search(
        self, query: str, limit: Optional[int] = None
    ) -> SearchBuilder:
        return self.client.search(self.dataset, query, limit)

    def add(
        self, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> ClientAddData:
        return self.client.add(self.dataset, document, metadata)

    def batch_add(self, documents: List[Dict[str, Any]]) -> List[ClientAddData]:
        return self.client.batch_add(self.dataset, documents)

    def create_context(self, query: str, limit: Optional[int] = None) -> List[str]:
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

        self.embedbase_url = embedbase_url.rstrip("/") + "/v1"
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
        # warn user that passing fastapi_app is not supported
        # in sync client
        if fastapi_app:
            raise ValueError(
                "fastapi_app is not supported in sync client. "
                "Please use AsyncEmbedbaseClient instead."
            )

    def create_context(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[str]:
        top_k = limit or 5
        search_url = f"{self.embedbase_url}/{dataset}/search"
        res = requests.post(
            search_url, headers=self.headers, json={"query": query, "top_k": top_k}
        )
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()
        return [similarity["data"] for similarity in data["similarities"]]

    def search(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> SearchBuilder:
        return SearchBuilder(self, dataset, query, {"limit": limit})

    def where(
        self, dataset: str, query: str, field: str, operator: str, value: Any
    ) -> SearchBuilder:
        return SearchBuilder(
            self, dataset, query,
        ).where(field, operator, value)

    def add(
        self, dataset: str, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> ClientAddData:
        add_url = f"{self.embedbase_url}/{dataset}"
        res = requests.post(
            add_url,
            headers=self.headers,
            json={"documents": [{"data": document, "metadata": metadata}]},
        )
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()

        return ClientAddData(
            id=data["results"][0]["id"],
            status="error" if data.get("error") else "success",
        )

    def batch_add(
        self, dataset: str, documents: List[Dict[str, Any]]
    ) -> List[ClientAddData]:
        add_url = f"{self.embedbase_url}/{dataset}"
        res = requests.post(
            add_url, headers=self.headers, json={"documents": documents}
        )
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()
        return [
            ClientAddData(
                id=result["id"], status="error" if data.get("error") else "success"
            )
            for result in data["results"]
        ]

    def clear(self, dataset: str) -> None:
        url = f"{self.embedbase_url}/{dataset}/clear"
        res = requests.get(url, headers=self.headers)
        if res.status_code != 200:
            raise Exception(res.text)

    def dataset(self, dataset: str) -> Dataset:
        return Dataset(client=self, dataset=dataset)

    def datasets(self) -> List[ClientDatasets]:
        datasets_url = f"{self.embedbase_url}/datasets"
        res = requests.get(datasets_url, headers=self.headers)
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()
        return [ClientDatasets(**dataset) for dataset in data["datasets"]]


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
    ) -> ClientAddData:
        return await self.client.add(self.dataset, document, metadata)

    async def batch_add(self, documents: List[Dict[str, Any]]) -> List[ClientAddData]:
        return await self.client.batch_add(self.dataset, documents)

    async def create_context(
        self, query: str, limit: Optional[int] = None
    ) -> List[str]:
        return await self.client.create_context(self.dataset, query, limit)

    async def clear(self) -> None:
        return await self.client.clear(self.dataset)


class EmbedbaseAsyncClient(BaseClient):
    def dataset(self, dataset: str) -> AsyncDataset:
        return AsyncDataset(client=self, dataset=dataset)

    async def create_context(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[str]:
        top_k = limit or 5
        search_url = f"/{dataset}/search"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                search_url, headers=self.headers, json={"query": query, "top_k": top_k}
            )
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()
        return [similarity["data"] for similarity in data["similarities"]]

    async def search(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[SearchResult]:
        top_k = limit or 5
        search_url = f"/{dataset}/search"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                search_url, headers=self.headers, json={"query": query, "top_k": top_k}
            )
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()
        return [SearchResult(**similarity) for similarity in data["similarities"]]

    async def add(
        self, dataset: str, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> ClientAddData:
        add_url = f"/{dataset}"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                add_url,
                headers=self.headers,
                json={"documents": [{"data": document, "metadata": metadata}]},
            )
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()
        return ClientAddData(
            id=data["results"][0]["id"],
            status="error" if data.get("error") else "success",
        )

    async def batch_add(
        self, dataset: str, documents: List[Dict[str, Any]]
    ) -> List[ClientAddData]:
        add_url = f"/{dataset}"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                add_url, headers=self.headers, json={"documents": documents}
            )
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()

        return [
            ClientAddData(
                id=result["id"],
                status="error" if data.get("error") else "success",
            )
            for result in data["results"]
        ]

    async def clear(self, dataset: str) -> None:
        url = f"/{dataset}/clear"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.get(url, headers=self.headers)
        if res.status_code != 200:
            raise Exception(res.text)

    async def datasets(self) -> List[ClientDatasets]:
        datasets_url = "/datasets"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.get(datasets_url, headers=self.headers)
        if res.status_code != 200:
            raise Exception(res.text)
        data = res.json()
        return [ClientDatasets(**dataset) for dataset in data["datasets"]]
