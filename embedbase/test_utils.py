from httpx import AsyncClient

from embedbase.settings import get_settings
from embedbase.supabase_db import Supabase

from .api import get_app

unit_testing_dataset = "unit_test"


async def clear_dataset(dataset_id: str = unit_testing_dataset):
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
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            f"/v1/{dataset_id}/clear",
        )
        assert response.status_code == 200
