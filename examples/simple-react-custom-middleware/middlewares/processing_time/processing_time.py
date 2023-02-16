import time
from typing import Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
class CustomHeaderMiddleware(BaseHTTPMiddleware):
    async def processing_time(request: Request, call_next) -> Tuple[str, str]:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        print("my middleware is running")
        print("processing_time middleware did this:", str(process_time))
        return response