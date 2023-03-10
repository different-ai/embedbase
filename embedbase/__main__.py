from embedbase.api import get_app
from embedbase.settings import get_settings


settings = get_settings()
app = get_app(settings)
