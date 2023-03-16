from embedbase import get_app
from embedbase.settings import get_settings
from embedbase.supabase_db import Supabase

settings = get_settings()
app = (
    get_app(settings)
    .use(
        Supabase(
            settings.supabase_url,
            settings.supabase_key,
        )
    )
    .run()
)
