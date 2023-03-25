import os
from embedbase import get_app
from embedbase.settings import Settings
from embedbase.databases.postgres_db import Postgres

openai_key = os.environ["OPENAI_API_KEY"]
settings = Settings(vector_database="postgres", openai_api_key=openai_key)
app = get_app(settings).use(Postgres()).run()
