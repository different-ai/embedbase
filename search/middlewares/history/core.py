import asyncio
from typing import Awaitable, Callable, Optional, Tuple
from .backends import BaseBackend
from starlette.types import ASGIApp, Scope, Receive, Send
from starlette.middleware.base import BaseHTTPMiddleware
from .errors import DetailedError
import os

_IGNORED_PATHS = [
    "openapi.json",
    "redoc",
    "docs",
]
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")


class HistoryMiddleware(BaseHTTPMiddleware):
    """
    history middleware
    """

    def __init__(
        self,
        app: ASGIApp,
        authenticate: Callable[[Scope], Awaitable[Tuple[str, str]]],
        backend: BaseBackend,
        *,
        on_auth_error: Optional[
            Callable[[Exception, Scope], Awaitable[ASGIApp]]
        ] = None,
        fallback_authenticate: Optional[Tuple[str, str]] = None,
        on_auth_success: Optional[Callable[[str, str, Scope], Awaitable[None]]] = None,
    ) -> None:
        """
        :param app: ASGI app
        :param authenticate: authenticate function
        :param backend: backend
        :param on_auth_error: on auth error
        :param fallback_authenticate: authentication fallback when the authenticate function fails
        For example, Google Authentication then fallback to IP Authentication
        :param on_auth_success: on auth success
        """

        self.app = app

        if not asyncio.iscoroutinefunction(authenticate):
            raise ValueError(f"invalid authenticate function: {authenticate}")

        if not asyncio.iscoroutinefunction(on_auth_error):
            raise ValueError(f"invalid on_auth_error function: {on_auth_error}")

        if not asyncio.iscoroutinefunction(on_auth_success):
            raise ValueError(f"invalid on_auth_success function: {on_auth_success}")

        assert isinstance(backend, BaseBackend), f"invalid backend: {backend}"

        self.authenticate = authenticate
        self.backend = backend
        self.on_auth_error = on_auth_error
        self.fallback_authenticate = fallback_authenticate
        self.on_auth_success = on_auth_success

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":  # pragma: no cover
            return await self.app(scope, receive, send)

        # in development mode, allow redoc, openapi etc
        if ENVIRONMENT == "development" and any(
            path in scope["path"] for path in _IGNORED_PATHS
        ):
            return await self.app(scope, receive, send)

        # calculate the user ID and group
        user, group = "local", "development"

        async def _on_error(exc):
            if self.on_auth_error is not None:
                response = await self.on_auth_error(exc, scope)
                return await response(scope, receive, send)
            raise exc

        try:
            user, group = await self.authenticate(scope)
        except Exception as exc:
            return await _on_error(exc)

        if self.on_auth_success is not None:
            self.on_auth_success(user, group, scope)

        # check if the user can log this request within his plan
        error = await self.backend.can_log(user, group, scope)
        if error is not None:
            # TODO 402 OK ? https://stackoverflow.com/questions/39221380/what-is-the-http-status-code-for-license-limit-reached
            return await _on_error(DetailedError(scope, 402, error))

        # TODO when merged https://github.com/encode/starlette/pull/1692
        # request = Request(scope, receive)
        # json_body = await request.json()
        # scope["body"] = json_body
        await self.backend.log(user, group, scope)
        return await self.app(scope, receive, send)
