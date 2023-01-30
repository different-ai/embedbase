from typing import Tuple

from starlette.types import Scope
from ..errors import DetailedError

from firebase_admin import auth, firestore
from google.api_core.exceptions import InvalidArgument

async def firebase_auth(scope: Scope) -> Tuple[str, str]:
    # extract token from header
    for name, value in scope["headers"]:  # type: bytes, bytes
        if name == b"authorization":
            authorization = value.decode("utf8")
            break
    else:
        authorization = None

    if not authorization:
        raise DetailedError(scope, 401, "missing authorization header")

    s = authorization.split(" ")

    if len(s) != 2:
        raise DetailedError(scope, 401, "invalid authorization header")

    token_type, token = s
    assert (
        token_type == "Bearer"
    ), "Authorization header must be `Bearer` type. Like: `Bearer LONG_JWT`"

    try:
        # decoded_token = auth.verify_id_token(token)
        # HACK to skip token expiration etc.
        # TODO: shouldn't check uid also?
        # remove whitespace before and after
        token = token.strip()
        docs = firestore.client().collection("links").where("token", "==", token).get()
        if len(docs) == 0:
            raise DetailedError(scope, 401, "invalid token")
        data = docs[0].to_dict()
    # except auth.ExpiredIdTokenError as err:
        # raise DetailedError(scope, 401, str(err))
    except InvalidArgument as err:
        raise DetailedError(scope, 500, "please delete cache and login again")
    except Exception as err:
        raise DetailedError(scope, 401, str(err))

    # add uid to scope
    scope["uid"] = data["userId"]
    scope["group"] = data.get("group", "default")
    try:
        user: auth.UserRecord = auth.get_user(scope["uid"])
    except:
        raise DetailedError(scope, 401, "invalid uid")
    claims = user.custom_claims or {}
    stripe_role = claims.get("stripeRole", "free")
    scope["stripe_role"] = stripe_role
    return scope["uid"], scope["group"]
