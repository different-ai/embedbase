from typing import Dict, Tuple

from starlette.types import Scope
from ..errors import EmptyInformation


async def from_session(scope: Scope) -> Tuple[str, str]:
    """
    get user id and group from session (need starlette SessionMiddleware)
    """
    assert (
        "session" in scope
    ), "Starlette SessionMiddleware must be installed to access request.session"
    session: Dict[str, str] = scope["session"]
    try:
        return session["user"], session.get("group", "default")
    except KeyError:
        raise EmptyInformation(scope)
