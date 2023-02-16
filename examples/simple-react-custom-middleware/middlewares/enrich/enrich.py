from typing import Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import requests
class CustomHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Tuple[str, str]:
        response = await call_next(request)
        blood_types = requests.get("https://random-data-api.com/api/v2/blood_types").json()
        response.headers["X-Enrich"] = str(blood_types)
        print("my middleware is running")
        print("enrich middleware did this:", blood_types)
        print("enrich middleware ran after processing_time middleware, look what it did")
        print("response.headers['X-Process-Time']", response.headers["X-Process-Time"])
        return response