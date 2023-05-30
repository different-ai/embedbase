from typing import Optional

from embedbase.app import Embedbase
from embedbase.settings import Settings


def get_app(settings: Optional[Settings] = None) -> Embedbase:
    app = Embedbase(settings)

    if settings and settings.auth == "firebase":
        from embedbase.firebase_auth import enable_firebase_auth

        app.logger.info("Enabling Firebase Auth")
        enable_firebase_auth(app)

    return app
