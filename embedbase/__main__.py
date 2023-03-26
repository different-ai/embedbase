import os
from embedbase import get_app
from embedbase.settings import Settings
from embedbase.database.postgres_db import Postgres
from embedbase.embedding.openai import OpenAI

openai_key = os.environ["OPENAI_API_KEY"]
settings = Settings()
app = get_app(settings).use(Postgres()).use(OpenAI(openai_key)).run()
