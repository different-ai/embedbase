import supabase
from embedbase import get_app
from embedbase.settings import get_settings

settings = get_settings()
app = (
    get_app(settings)
    .use(
        supabase.client.Client(
            settings.supabase_url,
            settings.supabase_key,
        )
    )
    .run()
)
