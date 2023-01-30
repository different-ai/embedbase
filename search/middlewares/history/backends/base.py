from abc import ABC, abstractmethod
from typing import Optional

from starlette.types import Scope

class BaseBackend(ABC):
    """
    Base class for all backend
    """

    @abstractmethod
    async def can_log(self, user: str, group: str, scope: Scope) -> Optional[str]:
        """
        Check if the user can log this request within his plan
        :param user: user id
        :param group: group id
        :param scope: scope
        :return: None if the user can log this request, otherwise return the error message
        """
        raise NotImplementedError

    @abstractmethod
    async def log(self, user: str, group: str, scope: Scope):
        """
        Log the request in the history
        :param user: user id
        :param group: group id
        :param scope: scope
        """
        raise NotImplementedError
