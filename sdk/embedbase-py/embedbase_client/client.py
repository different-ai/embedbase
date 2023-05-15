from typing import Any, Dict, List, Optional

import asyncio
from dataclasses import dataclass

import httpx
from abc import ABC, abstractmethod


from embedbase_client.types import (
    BatchAddDocument,
    ClientContextData,
    ClientSearchData,
    ClientAddData,
    ClientDatasets,
)


class BaseClient(ABC):
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

    @abstractmethod
    def create_context(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> ClientContextData:
        """
        Retrieve documents similar to the given query and create a context.

        Args:
            dataset: The name of the dataset to search in.
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A list of strings containing the document data for each similar document.

        Example usage:
            context = embedbase.create_context("my_dataset", "What is Python?", limit=3)
        """
        pass

    @abstractmethod
    def search(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> ClientSearchData:
        """
        Search for documents similar to the given query in the specified dataset.

        Args:
            dataset: The name of the dataset to search in.
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A list of SearchSimilarity objects containing the document data and other information for each similar document.

        Example usage:
            results = embedbase.search("my_dataset", "What is Python?", limit=3)
        """
        pass

    @abstractmethod
    def add(self, dataset: str, document: BatchAddDocument) -> ClientAddData:
        """
        Add a new document to the specified dataset.

        Args:
            dataset: The name of the dataset to add the document to.
            document: A BatchAddDocument instance with the document string and optional metadata.

        Returns:
            A dictionary containing the ID of the added document and the status of the operation.

        Example usage:
            document = BatchAddDocument(data="Python is a programming language.", metadata={"topic": "programming"})
            result = embedbase.add("my_dataset", document)
        """
        pass

    @abstractmethod
    def batch_add(
        self, dataset: str, documents: List[BatchAddDocument]
    ) -> List[ClientAddData]:
        """
        Add multiple documents to the specified dataset in a single batch.

        Args:
            dataset: The name of the dataset to add the documents to.
            documents: A list of BatchAddDocument instances, each containing the document string and optional metadata.

        Returns:
            A list of dictionaries, each containing the ID of the added document and the status of the operation.

        Example usage:
            documents = [
                BatchAddDocument(data="Python is a programming language.", metadata={"topic": "programming"}),
                BatchAddDocument(data="Java is also a programming language.", metadata={"topic": "programming"})
            ]
            results = embedbase.batch_add("my_dataset", documents)
        """
        pass

    @abstractmethod
    def clear(self, dataset: str) -> None:
        """
        Clear all documents from the specified dataset.

        Args:
            dataset: The name of the dataset to clear.

        Example usage:
            embedbase.clear("my_dataset")
        """
        pass

    @abstractmethod
    def datasets(self) -> ClientDatasets:
        """
        Retrieve a list of all datasets.

        Returns:
            A list of dataset names and metadata.

        Example usage:
            datasets = embedbase.datasets()
        """
        pass


@dataclass
class Dataset:
    client: "EmbedbaseClient"
    dataset: str

    def search(self, query: str, limit: Optional[int] = None) -> List[ClientSearchData]:
        return self.client.search(self.dataset, query, limit)

    def add(
        self, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> ClientAddData:
        return self.client.add(self.dataset, document, metadata)

    def batch_add(self, documents: List[Dict[str, Any]]) -> List[ClientAddData]:
        return self.client.batch_add(self.dataset, documents)

    def create_context(
        self, query: str, limit: Optional[int] = None
    ) -> List[ClientContextData]:
        return self.client.create_context(self.dataset, query, limit)

    def clear(self) -> None:
        return self.client.clear(self.dataset)


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

    def search(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[ClientSearchData]:
        return self._run_async(self._async_client.search(dataset, query, limit))

    def add(
        self, dataset: str, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> ClientAddData:
        return self._run_async(self._async_client.add(dataset, document, metadata))

    def batch_add(
        self, dataset: str, documents: List[Dict[str, Any]]
    ) -> List[ClientAddData]:
        return self._run_async(self._async_client.batch_add(dataset, documents))

    def create_context(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[ClientContextData]:
        return self._run_async(self._async_client.create_context(dataset, query, limit))

    def clear(self, dataset: str) -> None:
        return self._run_async(self._async_client.clear(dataset))

    def dataset(self, dataset: str) -> Dataset:
        return Dataset(client=self, dataset=dataset)

    def datasets(self) -> List[ClientDatasets]:
        return self._run_async(self._async_client.datasets())


@dataclass
class AsyncDataset:
    client: "EmbedbaseAsyncClient"
    dataset: str

    async def search(
        self, query: str, limit: Optional[int] = None
    ) -> List[ClientSearchData]:
        return await self.client.search(self.dataset, query, limit)

    async def add(
        self, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> ClientAddData:
        return await self.client.add(self.dataset, document, metadata)

    async def batch_add(self, documents: List[Dict[str, Any]]) -> List[dict]:
        return await self.client.batch_add(self.dataset, documents)

    async def create_context(
        self, query: str, limit: Optional[int] = None
    ) -> List[ClientContextData]:
        return await self.client.create_context(self.dataset, query, limit)

    async def clear(self) -> None:
        return await self.client.clear(self.dataset)


class EmbedbaseAsyncClient(BaseClient):
    def dataset(self, dataset: str) -> AsyncDataset:
        return AsyncDataset(client=self, dataset=dataset)

    async def search(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[ClientSearchData]:
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
    ) -> ClientAddData:
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
    ) -> List[ClientAddData]:
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

    async def create_context(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[ClientContextData]:
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

    async def clear(self, dataset: str) -> None:
        url = f"/v1/{dataset}/clear"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.get(url, headers=self.headers)
        res.raise_for_status()

    async def datasets(self) -> List[ClientDatasets]:
        datasets_url = "/v1/datasets"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.get(datasets_url, headers=self.headers)
        res.raise_for_status()
        data = res.json()
        return data["datasets"]
