from httpx import AsyncClient

from .api import app

namespace = "unit_test"



async def clear_dataset(dataset_id: str = namespace):
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.get(
            f"/v1/{dataset_id}/clear",
        )
        assert response.status_code == 200
