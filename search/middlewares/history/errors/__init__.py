from starlette.types import Scope

class EmptyInformation(Exception):
    def __init__(self, scope: Scope) -> None:
        self.scope = scope

class DetailedError(Exception):
    def __init__(self, scope: Scope, status_code: int, detail: str) -> None:
        self.scope = scope
        self.status_code = status_code
        self.detail = detail

    def __str__(self) -> str:
        return self.detail
