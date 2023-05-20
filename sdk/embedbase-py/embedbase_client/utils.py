from typing import Any, AsyncGenerator, Generator

import aiohttp
import requests


async def async_stream(url: str, body: str, headers: dict) -> AsyncGenerator[str, None]:
    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.post(url, data=body) as response:
            if response.status != 200:
                message = await response.text()
                raise Exception(message)

            async for value in response.content.iter_chunked(1024):
                chunk_value = value.decode("utf-8")
                yield chunk_value


def sync_stream(
    url: str, body: str, headers: dict, timeout: int
) -> Generator[str, None, None]:
    with requests.post(
        url, data=body, headers=headers, stream=True, timeout=timeout
    ) as response:
        if response.status_code != 200:
            message = response.text
            raise Exception(message)

        for value in response.iter_content(chunk_size=1024):
            chunk_value = value.decode("utf-8")
            yield chunk_value


class CustomAsyncGenerator:
    def __init__(self, async_gen: AsyncGenerator[Any, None]):
        self.async_gen = async_gen

    def __aiter__(self):
        return self.async_gen
