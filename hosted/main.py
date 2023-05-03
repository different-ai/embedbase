import os
from embedbase import get_app
from embedbase.settings import get_settings_from_file
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from middlewares.auth_api_key.auth_api_key import AuthApiKey
from embedbase.database.supabase_db import Supabase
from embedbase.embedding.openai import OpenAI

config_path = "config.yaml"
SECRET_PATH = "/secrets" if os.path.exists("/secrets") else ".."
# if can't find config.yaml in .. try . now (local dev)
if not os.path.exists(os.path.join(SECRET_PATH, config_path)):
    SECRET_PATH = "."

if not os.path.exists(os.path.join(SECRET_PATH, config_path)):
    # exit process with error
    print(f"ERROR: Missing {config_path} file")

settings = get_settings_from_file(os.path.join(SECRET_PATH, config_path))

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
)

app = app.run()

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