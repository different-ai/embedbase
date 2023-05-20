from typing import Any, Dict, List, Optional

import json
from dataclasses import dataclass

import httpx
from embedbase_client.base import BaseClient
from embedbase_client.errors import EmbedbaseAPIException
from embedbase_client.model import (
    ClientDatasets,
    Document,
    GenerateOptions,
    SearchSimilarity,
)
from embedbase_client.utils import CustomAsyncGenerator, async_stream


class AsyncSearchBuilder:
    def __init__(
        self, client, dataset: str, query: str, options: Optional[Dict[str, Any]] = None
    ):
        if options is None:
            options = {}
        self.client = client
        self.dataset = dataset
        self.query = query
        self.options = options

    async def get(self) -> List[SearchSimilarity]:
        return await self.search()

    async def search(self) -> "AsyncSearchBuilder":
        """
        Search for documents similar to the given query in the specified dataset asynchronously.

        Returns:
            An AsyncSearchBuilder instance that can be used to retrieve the search results.

        Example usage:
            results = await embedbase.search("my_dataset", "What is Python?", limit=3).get()
        """
        top_k = self.options.get("limit", None) or 5
        search_url = f"{self.client.embedbase_url}/{self.dataset}/search"

        request_body = {"query": self.query, "top_k": top_k}

        if "where" in self.options:
            request_body["where"] = self.options["where"]

        headers = self.client.headers
        async with httpx.AsyncClient() as client:
            res = await client.post(
                search_url,
                headers=headers,
                json=request_body,
                timeout=self.client.timeout,
            )
            if res.status_code != 200:
                raise EmbedbaseAPIException(res.text)
            data = res.json()
            return [
                SearchSimilarity(
                    id=similarity["id"],
                    similarity=similarity["score"],
                    data=similarity["data"],
                    embedding=similarity["embedding"],
                    hash=similarity["hash"],
                    metadata=similarity["metadata"],
                )
                for similarity in data["similarities"]
            ]

    def where(self, field: str, operator: str, value: Any) -> "AsyncSearchBuilder":
        # self.options["where"] = {field: {operator: value}}
        self.options["where"] = {}
        self.options["where"][field] = value
        return self


class AsyncListBuilder:
    def __init__(
        self,
        client,
        dataset: str,
        options: Optional[Dict[str, Any]] = None,
    ):
        if options is None:
            options = {}
        self.client = client
        self.dataset = dataset
        self.options = options

    async def get(self) -> List[Document]:
        return await self.list()

    async def list(self) -> "AsyncListBuilder":
        """
        Retrieve a list of all documents in the specified dataset asynchronously.

        Returns:
            A list of document IDs and metadata.

        Example usage:
            documents = await embedbase.list()
        """
        list_url = f"{self.client.embedbase_url}/{self.dataset}"

        if "offset" in self.options:
            list_url += f"?offset={self.options['offset']}"
        if "limit" in self.options:
            list_url += f"&limit={self.options['limit']}"

        headers = self.client.headers
        async with httpx.AsyncClient() as client:
            res = await client.get(
                list_url, headers=headers, timeout=self.client.timeout
            )
            if res.status_code != 200:
                raise EmbedbaseAPIException(res.text)
            data = res.json()
            return [Document(**document) for document in data["documents"]]

    def offset(self, offset: int) -> "AsyncListBuilder":
        self.options["offset"] = offset
        return self

    def limit(self, limit: int) -> "AsyncListBuilder":
        self.options["limit"] = limit
        return self


@dataclass
class AsyncDataset:
    client: "EmbedbaseAsyncClient"
    dataset: str

    def search(self, query: str, limit: Optional[int] = None) -> AsyncSearchBuilder:
        """
        Search for documents similar to the given query in the specified dataset asynchronously.

        Args:
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A list of SearchSimilarity instances containing the similarity score, data, embedding hash and metadata of similar documents.

        Example usage:
            results = await dataset.search("What is Python?", limit=3)
        """
        return AsyncSearchBuilder(self.client, self.dataset, query, {"limit": limit})

    async def add(
        self, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Document:
        """
        Add a new document to the specified dataset asynchronously.

        Args:
            document: A document.

        Returns:
            A document.

        Example usage:
            result = await dataset.add("Python is a programming language.", {"topic": "programming"})
        """
        return await self.client.add(self.dataset, document, metadata)

    async def batch_add(self, documents: List[Dict[str, Any]]) -> List[Document]:
        """
        Add multiple documents to the specified dataset in a single batch asynchronously.

        Args:
            documents: A list of documents.

        Returns:
            A list of documents.

        Example usage:
            documents = [
                {"data": "Python is a programming language.", metadata: {"topic": "programming"}},
                {"data": "Java is also a programming language.", metadata: {"topic": "programming"}},
            ]
            results = await dataset.batch_add(documents)
        """
        return await self.client.batch_add(self.dataset, documents)

    async def create_context(
        self, query: str, limit: Optional[int] = None
    ) -> List[str]:
        """
        Retrieve documents similar to the given query and create a context asynchronously.

        Args:
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A list of strings containing the document data for each similar document.

        Example usage:
            context = await dataset.create_context("What is Python?", limit=3)
        """
        return await self.client.create_context(self.dataset, query, limit)

    async def clear(self) -> None:
        """
        Clear all documents from the specified dataset asynchronously.

        Example usage:
            await dataset.clear()
        """
        return await self.client.clear(self.dataset)

    def list(self) -> AsyncListBuilder:
        """
        Retrieve a list of all documents in the specified dataset asynchronously.

        Returns:
            A list of documents.

        Example usage:
            documents = await dataset.list()
        """
        return AsyncListBuilder(self.client, self.dataset)


class EmbedbaseAsyncClient(BaseClient):
    def dataset(self, dataset: str) -> AsyncDataset:
        return AsyncDataset(client=self, dataset=dataset)

    async def create_context(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> List[str]:
        """
        Retrieve documents similar to the given query and create a context asynchronously.
        Args:
            dataset: The name of the dataset to perform similarity search on.
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A list of strings containing the document data for each similar document.
        Example usage:
            context = await embedbase.create_context("my_dataset", "What is Python?", limit=3)
        """

        top_k = limit or 5
        search_url = f"/{dataset}/search"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                search_url,
                headers=self.headers,
                json={"query": query, "top_k": top_k},
                timeout=self.timeout,
            )
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)
        data = res.json()
        return [similarity["data"] for similarity in data["similarities"]]

    def search(
        self, dataset: str, query: str, limit: Optional[int] = None
    ) -> AsyncSearchBuilder:
        """
        Search for documents similar to the given query in the specified dataset asynchronously.
        Args:
            dataset: The name of the dataset to perform similarity search on.
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A list of SearchSimilarity instances containing the embedding, hash, metadata, and string contents of each
            document, as well as the similarity score between the document and the query.

        Example usage:
            results = await embedbase.search("my_dataset", "What is Python?", limit=3)
        """
        return AsyncSearchBuilder(self, dataset, query, {"limit": limit})

    async def add(
        self, dataset: str, document: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Document:
        """
        Add a document to the specified dataset asynchronously.
        Args:
            dataset: The name of the dataset to add the document to.
            document: The document string to add to the dataset.
            metadata: Optional metadata about the document.

        Returns:
            A document.
        Example usage
            result = await embedbase.add("my_dataset", "Python is a programming language.", metadata={"topic": "programming"})
        """
        add_url = f"/{dataset}"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                add_url,
                headers=self.headers,
                json={"documents": [{"data": document, "metadata": metadata}]},
                timeout=self.timeout,
            )
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)
        data = res.json()
        return Document(**data["results"][0])

    async def batch_add(
        self, dataset: str, documents: List[Dict[str, Any]]
    ) -> List[Document]:
        """
        Add multiple documents to the specified dataset in a single batch asynchronously.

        Args:
            dataset: The name of the dataset to add the documents to.
            documents: A list of documents.

        Returns:
            A list of documents.

        Example usage:
            documents = [
                {"data": "Python is a programming language.", metadata: {"topic": "programming"}},
                {"data": "Java is also a programming language.", metadata: {"topic": "programming"}},
            ]
            results = await embedbase.batch_add("my_dataset", documents)
        """
        add_url = f"/{dataset}"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.post(
                add_url,
                headers=self.headers,
                json={"documents": documents},
                timeout=self.timeout,
            )
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)
        data = res.json()

        return [Document(**result) for result in data["results"]]

    async def clear(self, dataset: str) -> None:
        """
        Clear all documents from the specified dataset asynchronously.
        Args:
            dataset: The name of the dataset to clear.
        Example usage
            await embedbase.clear("my_dataset")
        """
        url = f"/{dataset}/clear"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.get(url, headers=self.headers, timeout=self.timeout)
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)

    async def datasets(self) -> List[ClientDatasets]:
        """
        Retrieve a list of all datasets asynchronously.
        Returns:
            A list of dataset names.
        Example usage
            results = await embedbase.datasets()
        """
        datasets_url = "/datasets"
        async with httpx.AsyncClient(
            app=self.fastapi_app, base_url=self.embedbase_url
        ) as client:
            res = await client.get(
                datasets_url, headers=self.headers, timeout=self.timeout
            )
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)
        data = res.json()
        return [ClientDatasets(**dataset) for dataset in data["datasets"]]

    def list(self, dataset: str) -> AsyncListBuilder:
        """
        Retrieve a list of all documents in the specified dataset asynchronously.

        Args:
            dataset: The name of the dataset to list.

        Returns:
            A list of document IDs and metadata.

        Example usage:
            documents = await embedbase.list("my_dataset")
        """
        return AsyncListBuilder(self, dataset, {})

    def generate(
        self, prompt: str, options: GenerateOptions = None
    ) -> CustomAsyncGenerator:
        """
        Generate text from an LLM using a asynchronous generator that fetches generated text data in chunks.

        Args:
            prompt (str): The text prompt to send to the API for generating responses.
            options (dict, optional): Options for the generation process, including history.
                                    Defaults to None.

        Returns:
            CustomAsyncGenerator[str, None, None]: An asynchronous generator that yields generated text data in chunks.
        """
        url = "https://app.embedbase.xyz/api/chat"

        options = options or {
            "history": [],
        }

        system = ""
        if options.get("history"):
            system_index = next(
                (
                    i
                    for i, item in enumerate(options["history"])
                    if item["role"] == "system"
                ),
                -1,
            )
            if system_index > -1:
                system = options["history"][system_index]["content"]
                del options["history"][system_index]

        async_gen = async_stream(
            url,
            json.dumps(
                {"prompt": prompt, "system": system, "history": options["history"]}
            ),
            self.headers,
        )
        return CustomAsyncGenerator(async_gen)
