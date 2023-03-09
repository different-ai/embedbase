from typing import Tuple
import warnings
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def enable_firebase_auth(app: FastAPI):
    from firebase_admin import auth

    @app.middleware("http")
    async def firebase_auth(request: Request, call_next) -> Tuple[str, str]:
        # extract token from header
        for name, value in request.headers.items():  # type: bytes, bytes
            print(name, value)
            if name == "authorization":
                authorization = value
                break
        else:
            authorization = None

        if not authorization:
            return JSONResponse(
                status_code=401, content={"error": "missing authorization header"}
            )

        s = authorization.split(" ")

        if len(s) != 2:
            return JSONResponse(
                status_code=401, content={"error": "invalid authorization header"}
            )

        token_type, token = s
        assert (
            token_type == "Bearer"
        ), "Authorization header must be `Bearer` type. Like: `Bearer LONG_JWT`"

        try:
            token = token.strip()
            decoded_token = auth.verify_id_token(token)
            # add uid to scope
            request.scope["uid"] = decoded_token["uid"]
        except Exception as err:
            warnings.warning(f"Error verifying token: {err}")
            return JSONResponse(status_code=401, content={"error": "invalid token"})

        response = await call_next(request)
        return response
