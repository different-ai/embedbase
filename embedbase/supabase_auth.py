from typing import Tuple
import warnings
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def enable_supabase_auth(app: FastAPI):
    @app.middleware("http")
    async def supabase_auth(request: Request, call_next) -> Tuple[str, str]:
        raise NotImplementedError