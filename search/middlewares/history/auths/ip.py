from ipaddress import ip_address
from typing import Tuple

from starlette.types import Scope
from ..errors import EmptyInformation


async def client_ip(scope: Scope) -> Tuple[str, str]:
    """
    parse ip
    """
    real_ip = ""
    if scope["client"]:
        ip, port = tuple(scope["client"])
        if ip_address(ip).is_global:
            real_ip = ip
    else:
        raise EmptyInformation(scope)

    for name, value in scope["headers"]:  # type: bytes, bytes
        # https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
        # google cloud hide client ip but pass x-forwarded-for
        if name == b"x-real-ip" or name == b"x-forwarded-for":
            ip = value.decode("utf8")

        if not real_ip and ip_address(ip).is_global:
            real_ip = ip

    if not real_ip:
        raise EmptyInformation(scope)
    return real_ip, "default"
