from typing import Any, Dict, Generator, List, Optional

import json
from dataclasses import dataclass

import requests
from embedbase_client.base import BaseClient
from embedbase_client.errors import EmbedbaseAPIException
from embedbase_client.model import ClientDatasets, Document, GenerateOptions, Metadata, SearchSimilarity
from embedbase_client.utils import sync_stream


class SyncSearchBuilder:
    def __init__(
        self,
        client: BaseClient,
        dataset: str,
        query: str,
        options: Optional[Dict[str, Any]] = None,
    ):
        if options is None:
            options = {}
        self.client = client
        self.dataset = dataset
        self.query = query
        self.options = options

    def get(self) -> List[SearchSimilarity]:
        return self.search()

    def search(self) -> "SyncSearchBuilder":
        """
        Search for documents similar to the given query in the specified dataset.

        Args:
            dataset: The name of the dataset to search in.
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A SyncSearchBuilder instance that can be used to retrieve the search results.

        Example usage:
            results = embedbase.search("my_dataset", "What is Python?", limit=3).get()
        """
        top_k = self.options.get("limit", None) or 5
        search_url = f"{self.client.embedbase_url}/{self.dataset}/search"

        request_body = {"query": self.query, "top_k": top_k}

        if "where" in self.options:
            request_body["where"] = self.options["where"]

        headers = self.client.headers
        res = requests.post(
            search_url, headers=headers, json=request_body, timeout=self.client.timeout
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

    def where(self, field: str, operator: str, value: Any) -> "SyncSearchBuilder":
        # self.options["where"] = {field: {operator: value}}
        self.options["where"] = {}
        self.options["where"][field] = value
        return self


class SyncListBuilder:
    def __init__(
        self,
        client: BaseClient,
        dataset: str,
        options: Optional[Dict[str, Any]] = None,
    ):
        if options is None:
            options = {}
        self.client = client
        self.dataset = dataset
        self.options = options

    def get(self) -> List[Document]:
        return self.list()

    def list(self) -> "SyncListBuilder":
        list_url = f"{self.client.embedbase_url}/{self.dataset}"

        if "offset" in self.options:
            list_url += f"?offset={self.options['offset']}"
        if "limit" in self.options:
            list_url += f"&limit={self.options['limit']}"

        headers = self.client.headers
        res = requests.get(list_url, headers=headers, timeout=self.client.timeout)
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)
        data = res.json()
        return [Document(**document) for document in data["documents"]]

    def offset(self, offset: int) -> "SyncListBuilder":
        self.options["offset"] = offset
        return self

    def limit(self, limit: int) -> "SyncListBuilder":
        self.options["limit"] = limit
        return self


@dataclass
class Dataset:
    client: "EmbedbaseClient"
    dataset: str

    def search(self, query: str, limit: Optional[int] = None) -> SyncSearchBuilder:
        """
        Search for documents similar to the given query in the specified dataset.

        Args:
            dataset: The name of the dataset to search in.
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A SyncSearchBuilder instance that can be used to retrieve the search results.

        Example usage:
            results = dataset.search("my_dataset", "What is Python?", limit=3).get()
        """
        return SyncSearchBuilder(self.client, self.dataset, query, {"limit": limit})

    def add(self, document: str, metadata: Optional[Dict[str, Any]] = None) -> Document:
        """
        Add a new document to the specified dataset.

        Args:
            dataset: The name of the dataset to add the document to.
            document: A BatchAddDocument instance with the document string and optional metadata.

        Returns:
            A dictionary containing the ID of the added document and the status of the operation.

        Example usage:
            result = dataset.add("my_dataset", "Python is a programming language.", {"topic": "programming"})
        """
        return self.client.add(self.dataset, document, metadata)

    def batch_add(self, documents: List[Document]) -> List[Document]:
        """
        Add multiple documents to the specified dataset in a single batch.

        Args:
            dataset: The name of the dataset to add the documents to.
            documents: A list of documents, each containing the document data and optional metadata.

        Returns:
            A list of documents.

        Example usage:
            documents = [
                {"data": "Python is a programming language.", "metadata": {"topic": "programming"}},
                {"data": "Python is a snake.", "metadata": {"topic": "animals"}},
            ]
            results = dataset.batch_add("my_dataset", documents)
        """
        return self.client.batch_add(self.dataset, documents)

    def create_context(self, query: str, limit: Optional[int] = None) -> List[str]:
        """
        Retrieve documents similar to the given query and create a context.

        Args:
            dataset: The name of the dataset to search in.
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A list of strings containing the document data for each similar document.

        Example usage:
            context = dataset.create_context("my_dataset", "What is Python?", limit=3)
        """
        return self.client.create_context(self.dataset, query, limit)

    def clear(self) -> None:
        """
        Clear all documents from the specified dataset.

        Args:
            dataset: The name of the dataset to clear.

        Example usage:
            dataset.clear("my_dataset")
        """
        return self.client.clear(self.dataset)

    def list(self) -> SyncListBuilder:
        """
        Retrieve a list of all documents in the specified dataset.

        Args:
            dataset: The name of the dataset to list.

        Returns:
            A list of document IDs and metadata.

        Example usage:
            documents = dataset.list()
        """
        return SyncListBuilder(self.client, self.dataset, {})


class EmbedbaseClient(BaseClient):
    def __init__(
        self,
        embedbase_url: str = "https://api.embedbase.xyz",
        embedbase_key: Optional[str] = None,
        fastapi_app: Optional[Any] = None,
        timeout: Optional[float] = 30,
    ):
        super().__init__(embedbase_url, embedbase_key, timeout=timeout)
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
        top_k = limit or 5
        search_url = f"{self.embedbase_url}/{dataset}/search"
        res = requests.post(
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
    ) -> SyncSearchBuilder:
        """
        Search for documents similar to the given query in the specified dataset.

        Args:
            dataset: The name of the dataset to search in.
            query: The query string to find similar documents.
            limit: The maximum number of similar documents to return (default is None, which returns up to 5 documents).

        Returns:
            A SyncSearchBuilder instance that can be used to retrieve the search results.

        Example usage:
            results = embedbase.search("my_dataset", "What is Python?", limit=3).get()
        """
        return SyncSearchBuilder(self, dataset, query, {"limit": limit})

    def where(
        self, dataset: str, query: str, field: str, operator: str, value: Any
    ) -> SyncSearchBuilder:
        return SyncSearchBuilder(
            self,
            dataset,
            query,
        ).where(field, operator, value)

    def add(
        self, dataset: str, document: str, metadata: Optional[Metadata] = None
    ) -> Document:
        """
        Add a new document to the specified dataset.

        Args:
            dataset: The name of the dataset to add the document to.
            document: A document.

        Returns:
            A document.

        Example usage:
            result = embedbase.add("my_dataset", "Python is a programming language.", {"topic": "programming"})
        """
        add_url = f"{self.embedbase_url}/{dataset}"
        res = requests.post(
            add_url,
            headers=self.headers,
            json={"documents": [{"data": document, "metadata": metadata}]},
            timeout=self.timeout,
        )
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)
        data = res.json()

        return Document(
            **data["results"][0],
        )

    def batch_add(
        self, dataset: str, documents: List[Dict[str, Any]]
    ) -> List[Document]:
        """
        Add multiple documents to the specified dataset in a single batch.

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
            results = embedbase.batch_add("my_dataset", documents)
        """
        add_url = f"{self.embedbase_url}/{dataset}"
        res = requests.post(
            add_url,
            headers=self.headers,
            json={"documents": documents},
            timeout=self.timeout,
        )
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)
        data = res.json()
        return [
            Document(
                **result,
            )
            for result in data["results"]
        ]

    def clear(self, dataset: str) -> None:
        """
        Clear all documents from the specified dataset.

        Args:
            dataset: The name of the dataset to clear.

        Example usage:
            embedbase.clear("my_dataset")
        """
        url = f"{self.embedbase_url}/{dataset}/clear"
        res = requests.get(url, headers=self.headers, timeout=self.timeout)
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)

    def dataset(self, dataset: str) -> Dataset:
        return Dataset(client=self, dataset=dataset)

    def datasets(self) -> List[ClientDatasets]:
        """
        Retrieve a list of all datasets.

        Returns:
            A list of dataset names and metadata.

        Example usage:
            datasets = embedbase.datasets()
        """
        datasets_url = f"{self.embedbase_url}/datasets"
        res = requests.get(datasets_url, headers=self.headers, timeout=self.timeout)
        if res.status_code != 200:
            raise EmbedbaseAPIException(res.text)
        data = res.json()
        return [ClientDatasets(**dataset) for dataset in data["datasets"]]

    def list(self, dataset: str) -> SyncListBuilder:
        """
        Retrieve a list of all documents in the specified dataset.

        Args:
            dataset: The name of the dataset to list.

        Returns:
            A list of document IDs and metadata.

        Example usage:
            documents = embedbase.list("my_dataset")
        """
        return SyncListBuilder(self, dataset, {})

    def generate(self, prompt: str, options: GenerateOptions = None) -> Generator[str, None, None]:
        """
        Generate text from an LLM using a synchronous generator that fetches generated text data in chunks.

        Args:
            prompt (str): The text prompt to send to the API for generating responses.
            options (dict, optional): Options for the generation process, including history.
                                    Defaults to None.

        Returns:
            Generator[str, None, None]: A synchronous generator that yields generated text data in chunks.
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

        return sync_stream(
            url,
            json.dumps(
                {"prompt": prompt, "system": system, "history": options["history"]}
            ),
            self.headers,
            self.timeout,
        )
