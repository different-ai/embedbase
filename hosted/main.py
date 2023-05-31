import os

import sentry_sdk
from embedbase_internet_search import internet_search
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from middlewares.auth_api_key.auth_api_key import AuthApiKey

from embedbase import get_app
from embedbase.database.supabase_db import Supabase
from embedbase.embedding.openai import OpenAI
from embedbase.settings import get_settings_from_file

config_path = "config.yaml"
SECRET_PATH = "/secrets" if os.path.exists("/secrets") else ".."
# if can't find config.yaml in .. try . now (local dev)
if not os.path.exists(os.path.join(SECRET_PATH, config_path)):
    SECRET_PATH = "."

if not os.path.exists(os.path.join(SECRET_PATH, config_path)):
    # exit process with error
    print(f"ERROR: Missing {config_path} file")

settings = get_settings_from_file(os.path.join(SECRET_PATH, config_path))

version = open(os.path.join(os.path.dirname(__file__), "version.txt")).read().strip()


sentry_sdk.init(
    dsn="https://7da354091a684d008c5747511fcba0ec@o4504847298461696.ingest.sentry.io/4504847314386944",
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    # We recommend adjusting this value in production,
    traces_sample_rate=0.1,
    environment=os.environ.get("ENVIRONMENT", "development"),
    _experiments={
        "profiles_sample_rate": 0.1,
    },
    release=version,
)

app = (
    get_app(settings)
    .use_embedder(OpenAI(settings.openai_api_key, settings.openai_organization))
    .use_db(Supabase(settings.supabase_url, settings.supabase_key))
    .use_middleware(AuthApiKey)
    .use_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
).run()

app.add_api_route("/v1/search/internet", internet_search, methods=["POST"])


@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": "An error occurred in the server."},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )
