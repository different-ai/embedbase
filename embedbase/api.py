import os
from typing import Optional
from embedbase.app import Embedbase

from embedbase.settings import Settings


def get_app(settings: Optional[Settings] = None) -> Embedbase:
    app = Embedbase(settings)

    if settings and settings.sentry:
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

    if settings and settings.auth == "firebase":
        from embedbase.firebase_auth import enable_firebase_auth

        app.logger.info("Enabling Firebase Auth")
        enable_firebase_auth(app)

    return app
