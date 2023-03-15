import hashlib
import os
import time
import urllib.parse
import uuid

from fastapi import Depends, Request, status
from fastapi.responses import JSONResponse
from pandas import DataFrame
from embedbase.app import Embedbase

from embedbase.db_utils import batch_select
from embedbase.embeddings import embed, is_too_big
from embedbase.firebase_auth import enable_firebase_auth
from embedbase.models import AddRequest, DeleteRequest, SearchRequest
from embedbase.settings import Settings, get_settings
from embedbase.utils import get_user_id


def get_app(settings: Settings) -> Embedbase:
    app = Embedbase(settings)

    if settings.sentry:
        app.logger.info("Enabling Sentry")
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry,
            # Set traces_sample_rate to 1.0 to capture 100%
            # of transactions for performance monitoring.
            # We recommend adjusting this value in production,
            traces_sample_rate=0.2,
            environment=os.environ.get("ENVIRONMENT", "development"),
            _experiments={
                "profiles_sample_rate": 1.0,
            },
        )

    if settings.auth == "firebase":
        app.logger.info("Enabling Firebase Auth")
        enable_firebase_auth(app)

    

    return app
