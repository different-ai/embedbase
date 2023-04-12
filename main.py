import os
from embedbase import get_app
from embedbase.settings import get_settings_from_file
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from embedbase.database.supabase_db import Supabase
from embedbase.embedding.openai import OpenAI
from embedbase.settings import Settings

app = (
    get_app(Settings())
    .use_embedder(OpenAI("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"))
    .use_db(Supabase("https://gsvrjbbwczpzyrwipwmx.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzdnJqYmJ3Y3pwenlyd2lwd214Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4MDA2OTU1MywiZXhwIjoxOTk1NjQ1NTUzfQ.35EhWDOnTAWL2K11zCh_8GSNfQfkREfBRH-IRCbVz7E"))
)

app = app.run()