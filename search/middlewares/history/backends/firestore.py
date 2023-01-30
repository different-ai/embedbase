from itertools import groupby
from typing import Optional
from . import BaseBackend
from google.cloud.firestore import Client, SERVER_TIMESTAMP

from starlette.types import Scope
import datetime
from .plans import plans



class FirestoreBackend(BaseBackend):
    """simple history tracker with Firestore"""

    def __init__(self, firestore: Client) -> None:
        self._firestore = firestore

    async def can_log(self, user: str, group: str, scope: Scope) -> Optional[str]:
        """
        check if the user can query this path within his plan
        Free plan
        50 texts
        10 images
        30 links
        Hobby # no bankrupcy
        50 x 20 = 1000 texts
        10 x 20 = 200 images
        30 x 20 = 600 links
        Pro
        same temporarily
        """

        # get all the requests since the beginning of the month (first day)
        current_month_history_by_path_doc = self._firestore.collection("quotas").document(
            user
        ).get()
        # no log yet
        if not current_month_history_by_path_doc.exists:
            return None
        # i.e. {"/v1/text/create": 3, "/v1/image/create": 2 ...}
        current_month_history_by_path = current_month_history_by_path_doc.to_dict()
        stripe_role = scope.get("stripe_role", "free")

        if stripe_role == "free":
            p = "/v1/text/create"
            if scope["path"] == p:
                if current_month_history_by_path[p] > plans[stripe_role][p]:
                    return (
                        f"You exceeded your plan limit of {plans[stripe_role][p]} texts. "
                        + "Please upgrade your plan on https://app.anotherai.co"
                    )
            p = "/v1/image/create"
            if scope["path"] == p:
                if current_month_history_by_path[p] > plans[stripe_role][p]:
                    return (
                        f"You exceeded your plan limit of {plans[stripe_role][p]} images. "
                        + "Please upgrade your plan on https://app.anotherai.co"
                    )
            p = "/v1/search"
            if scope["path"] == p:
                if current_month_history_by_path[p] > plans[stripe_role][p]:
                    return (
                        f"You exceeded your plan limit of {plans[stripe_role][p]} links. "
                        + "Please upgrade your plan on https://app.anotherai.co"
                    )
        elif stripe_role == "hobby":
            p = "/v1/text/create"
            if scope["path"] == p:
                if current_month_history_by_path[p] > plans[stripe_role][p]:
                    return (
                        f"You exceeded your plan limit of {plans[stripe_role][p]} texts. "
                        + "Please upgrade your plan on https://app.anotherai.co"
                    )
            p = "/v1/image/create"
            if scope["path"] == p:
                if current_month_history_by_path[p] > plans[stripe_role][p]:
                    return (
                        f"You exceeded your plan limit of {plans[stripe_role][p]} images. "
                        + "Please upgrade your plan on https://app.anotherai.co"
                    )
            p = "/v1/search"
            if scope["path"] == p:
                if current_month_history_by_path[p] > plans[stripe_role][p]:
                    return (
                        f"You exceeded your plan limit of {plans[stripe_role][p]} links. "
                        + "Please upgrade your plan on https://app.anotherai.co"
                    )

        elif stripe_role == "pro":
            p = "/v1/text/create"
            if scope["path"] == p:
                if current_month_history_by_path[p] > plans[stripe_role][p]:
                    return (
                        f"You exceeded your plan limit of {plans[stripe_role][p]} texts. "
                        + "Please contact us at ben@prologe.io to increase your plan limit"
                    )
            p = "/v1/image/create"
            if scope["path"] == p:
                if current_month_history_by_path[p] > plans[stripe_role][p]:
                    return (
                        f"You exceeded your plan limit of {plans[stripe_role][p]} images. "
                        + "Please contact us at ben@prologe.io to increase your plan limit"
                    )
            p = "/v1/search"
            if scope["path"] == p:
                if current_month_history_by_path[p] > plans[stripe_role][p]:
                    return (
                        f"You exceeded your plan limit of {plans[stripe_role][p]} links. "
                        + "Please contact us at ben@prologe.io to increase your plan limit"
                    )

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
