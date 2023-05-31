from typing import Tuple

import os
import re
import warnings

import posthog
import yaml
from fastapi import Request
from fastapi.responses import JSONResponse
from firebase_admin import auth, credentials, firestore, initialize_app
from starlette.middleware.base import BaseHTTPMiddleware

from supabase import Client, PostgrestAPIError, create_client

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
SECRET_PATH = "/secrets" if os.path.exists("/secrets") else ".."
# if can't find config.yaml in .. try . now (local dev)
if not os.path.exists(SECRET_PATH + "/config.yaml"):
    SECRET_PATH = "."

if not os.path.exists(SECRET_PATH + "/config.yaml"):
    # exit process with error
    print("ERROR: Missing config.yaml file")

data = yaml.safe_load(open(f"{SECRET_PATH}/config.yaml"))
SUPABASE_URL = data["supabase_url"]
SUPABASE_KEY = data["supabase_key"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

DEVELOPMENT_IGNORED_PATHS = [
    "openapi.json",
    "redoc",
    "docs",
]

PRODUCTION_IGNORED_PATHS = [
    "health",
    "auth-health",
]

SECRET_FIREBASE_PATH = (
    "/secrets_firebase" if os.path.exists("/secrets_firebase") else ".."
)

posthog.project_api_key = "phc_plfzAimxHysKLaS80RK3NPaL0OJhlg983m3o5Zuukp"
posthog.host = "https://app.posthog.com"
posthog.debug = ENVIRONMENT == "development"

if not os.path.exists(SECRET_FIREBASE_PATH + "/svc.prod.json"):
    SECRET_FIREBASE_PATH = "."
try:
    cred = credentials.Certificate(SECRET_FIREBASE_PATH + "/svc.prod.json")
    initialize_app(cred)
    fc = firestore.client()
except Exception as e:
    print(e)


class DetailedError(Exception):
    def __init__(self, scope: dict, status_code: int, detail: str) -> None:
        self.scope = scope
        self.status_code = status_code
        self.detail = detail

    def __str__(self) -> str:
        return self.detail


async def on_auth_error(exc: Exception, scope: dict):
    status_code = exc.status_code if hasattr(exc, "status_code") else 500
    message = exc.detail if hasattr(exc, "detail") else str(exc)

    warnings.warn(message)
    return JSONResponse(
        status_code=status_code,
        content={"message": message},
    )


def get_in_firebase(api_key: str, scope: dict):
    doc = fc.collection("apikeys").document(api_key).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    if "userId" not in data:
        return None
    user: auth.UserRecord = auth.get_user(data["userId"])
    return {
        "uid": user.uid,
        "email": user.email,
    }


def get_in_supabase(api_key: str, scope: dict):
    try:
        res = supabase.from_("api-keys").select("*").eq("api_key", api_key).execute()
        if not res.data or "user_id" not in res.data[0]:
            return None
        uid = res.data[0]["user_id"]
        user = supabase.auth.admin.get_user_by_id(uid).user
        return {
            "uid": user.id,
            "email": user.email,
        }
    except PostgrestAPIError:
        raise DetailedError(scope, 401, "invalid api key")


async def check_api_key(scope: dict) -> Tuple[str, str]:
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

    token_type, api_key = s
    assert (
        token_type == "Bearer"
    ), "Authorization header must be `Bearer` type. Like: `Bearer LONG_JWT`"

    assert api_key, "invalid api key"

    try:
        user = get_in_firebase(api_key, scope) or get_in_supabase(api_key, scope)
        if not user:
            raise DetailedError(scope, 401, "invalid api key")
        scope["uid"] = user["uid"]
        scope["email"] = user["email"]
    except Exception as err:
        raise DetailedError(scope, 401, str(err))

    return user, api_key


search_pattern = re.compile(r"^/v1/.+/search$")
add_pattern = re.compile(r"^/v1/[^/]+$")
internet_search_pattern = re.compile(r"^/v1/search/internet$")
replace_pattern = re.compile(r"^/v1/.+/replace$")


def get_event_from_request(request: Request):
    # remove trailing slash
    path = request.scope["path"].rstrip("/")
    # method = request.scope["method"]
    # POST /v1/{vault_id}/search
    if re.match(search_pattern, path):
        return "search"

    # POST /v1/{vault_id}
    if re.match(add_pattern, path):
        return "add"

    # POST /v1/internet/search
    if re.match(internet_search_pattern, path):
        return "internet-search"

    # POST /v1/{dataset_id}/replace
    if re.match(replace_pattern, path):
        return "replace"

    return None


class AuthApiKey(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Tuple[str, str]:
        """ """
        if request.scope["type"] != "http":  # pragma: no cover
            return await call_next(request)

        if any(path in request.scope["path"] for path in PRODUCTION_IGNORED_PATHS):
            return await call_next(request)
        # in development mode, allow redoc, openapi etc
        if ENVIRONMENT == "development" and any(
            path in request.scope["path"] for path in DEVELOPMENT_IGNORED_PATHS
        ):
            return await call_next(request)

        try:
            user, api_key = await check_api_key(request.scope)
            posthog.identify(
                user["uid"],
                {
                    "email": user["email"],
                },
            )
            event = get_event_from_request(request)
            # otherwise we don't track
            if event:
                posthog.capture(
                    user["uid"],
                    event=event,
                    properties={
                        "api_key": api_key,
                        "email": user["email"],
                    },
                )
        except Exception as exc:
            return await on_auth_error(exc, request.scope)
        response = await call_next(request)
        return response
