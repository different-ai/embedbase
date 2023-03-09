import pytest
from httpx import AsyncClient

from embedbase.firebase_auth import enable_firebase_auth

@pytest.mark.asyncio
async def test_enable_firebase_auth():
    from .api import app

    # before enabling auth, we should be able to make queries
    # without any authorization header
    enable_firebase_auth(app)

    # after enabling auth, we should get a 401 error
    # when not providing an authorization header
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            "/v1/unit_test/search",
            json={"query": "bob"},
        )
        assert response.status_code == 401
    # when providing an authorization header, we should be able to make queries
    # TODO: cannot create id token on backend :/