import math
from random import randint

from httpx import AsyncClient
import numpy as np
import openai
import pandas as pd

import pytest
from embedbase.settings import Settings
from embedbase import get_app
from embedbase.database.supabase_db import Supabase
from embedbase.embedding.openai import OpenAI

unit_testing_dataset = "unit_test"


class CustomSettings(Settings):
    embedbase_api_key: str


settings = CustomSettings.parse_file("./config.yaml")
openai.api_key = settings.openai_api_key
openai.organization = settings.openai_organization


async def clear_dataset(dataset_id: str = unit_testing_dataset):
    app = (
        get_app(settings)
        .use_embedder(OpenAI(settings.openai_api_key, settings.openai_organization))
        .use_db(
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
            headers={
                "Authorization": f"Bearer {settings.embedbase_api_key}",
            },
        )
        assert response.status_code == 200


@pytest.mark.asyncio
async def test_clear():
    app = (
        get_app(settings)
        .use_embedder(OpenAI(settings.openai_api_key, settings.openai_organization))
        .use_db(
            Supabase(
                settings.supabase_url,
                settings.supabase_key,
            )
        )
        .run()
    )
    await clear_dataset()
    df = pd.DataFrame(
        [
            "".join(
                [
                    chr(math.floor(97 + 26 * np.random.rand()))
                    for _ in range(randint(500, 800))
                ]
            )
            for _ in range(10)
        ],
        columns=["text"],
    )
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}",
            json={
                "documents": [
                    {
                        "data": text,
                    }
                    for i, text in enumerate(df.text.tolist())
                ],
            },
            headers={
                "Authorization": f"Bearer {settings.embedbase_api_key}",
            },
        )
        assert response.status_code == 200
        json_response = response.json()
        assert len(json_response.get("results")) == 10

    await clear_dataset()
    # search now
    async with AsyncClient(app=app, base_url="http://localhost:8000") as client:
        response = await client.post(
            f"/v1/{unit_testing_dataset}/search",
            json={"query": "bob"},
            headers={
                "Authorization": f"Bearer {settings.embedbase_api_key}",
            },
        )
        assert response.status_code == 200
        json_response = response.json()
        assert json_response.get("query", "") == "bob"
        assert len(json_response.get("similarities")) == 0
