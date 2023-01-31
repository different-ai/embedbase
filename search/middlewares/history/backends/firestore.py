from itertools import groupby
from typing import Awaitable, Callable, Optional
from . import BaseBackend
from google.cloud.firestore import Client, SERVER_TIMESTAMP
from starlette.types import Scope, ASGIApp


class FirestoreBackend(BaseBackend):
    """simple history tracker with Firestore"""

    def __init__(
        self,
        firestore: Client,
        can_log: Optional[Callable[[Client, str, str, Scope], Awaitable[Optional[str]]]] = None,
    ):
        self._firestore = firestore
        self._can_log = can_log

    async def can_log(self, user: str, group: str, scope: Scope) -> Optional[str]:
        if not self._can_log:
            return None
        return await self._can_log(user, group, scope)

    async def log(self, user: str, group: str, scope: Scope):
        """log the request in the history"""
        metadata = dict(scope)
        del metadata["app"]
        # turn headers [(b"key", b"value"), ...] into {"key": "value", ...}
        metadata["headers"] = dict(
            (k.decode("utf8"), v.decode("utf8")) for k, v in metadata["headers"]
        )
        self._firestore.collection("history").add(
            {
                "user": user,
                "group": group,
                "scope": metadata,
                "timestamp": SERVER_TIMESTAMP,
            }
        )
