from typing import Any, AsyncGenerator, Generator
from embedbase_client.errors import EmbedbaseAPIException
import aiohttp
import requests


async def async_stream(url: str, body: str, headers: dict) -> AsyncGenerator[str, None]:
    """
    This function is used to stream the response from the server.
    :param url: The url of the API to which to POST.
    :param body: The body of the POST request.
    :param headers: The headers of the POST request.
    :return: A generator that yields the response from the server.
    """
    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.post(url, data=body) as response:
            if response.status != 200:
                message = await response.json()
                raise EmbedbaseAPIException(message.get("error", message))

            async for value in response.content.iter_chunked(1024):
                chunk_value = value.decode("utf-8")
                yield chunk_value


def sync_stream(
    url: str, body: str, headers: dict, timeout: int
) -> Generator[str, None, None]:
    """
    This function is used to stream the response from the server.
    :param url: The url of the API to which to POST.
    :param body: The body of the POST request.
    :param headers: The headers of the POST request.
    :param timeout: How long to wait for the server to send data before giving up.
    :return: A generator that yields the response from the server.
    """
    with requests.post(
        url, data=body, headers=headers, stream=True, timeout=timeout
    ) as response:
        if response.status_code != 200:
            message = response.json()
            raise EmbedbaseAPIException(message.get("error", message))

        for value in response.iter_content(chunk_size=1024):
            chunk_value = value.decode("utf-8")
            yield chunk_value


class CustomAsyncGenerator:
    def __init__(self, async_gen: AsyncGenerator[Any, None]):
        self.async_gen = async_gen

    def __aiter__(self):
        return self.async_gen
