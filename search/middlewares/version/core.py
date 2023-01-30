import asyncio
from typing import Awaitable, Callable, Optional
from starlette.types import Scope, Receive, Send, ASGIApp
from starlette.middleware.base import BaseHTTPMiddleware
from packaging import version


class VersionMiddleware(BaseHTTPMiddleware):
    """
    history middleware
    """

    def __init__(
        self,
        app: ASGIApp,
        version: str,
        on_error: Optional[Callable[[Exception, Scope], Awaitable[ASGIApp]]] = None,
    ) -> None:
        """ """
        self.app = app
        self.version = version
        self.on_error = on_error

        if not asyncio.iscoroutinefunction(self.on_error):
            raise ValueError(f"invalid on_error function: {self.on_error}")


    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:

        """
        Check the client version and return a 400 if it's too old.
        """
        if scope["type"] != "http":  # pragma: no cover
            return await self.app(scope, receive, send)

        # iterating from the end because the client version is usually the last header
        for name, value in reversed(scope["headers"]):
            if name == b"x-client-version":
                client_version = value.decode("utf8")
                break
        else:
            client_version = None
        try:
            ok = version.parse(client_version) >= version.parse(self.version)
        except Exception as e:
            # if client pass in a bad version
            print(f"Failed to parse client version: {e}")
            ok = False
        scope["client_version"] = client_version
        if not ok:
            response = await self.on_error(
                Exception(f"Client version {client_version} is too old. "), scope
            )
            return await response(scope, receive, send)
        response = await self.app(scope, receive, send)
        return response
