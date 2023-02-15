⚠️ Alpha version 

**There are ongoing efforts to make it more modular and easy to use**

[![Try it on gitpod](https://img.shields.io/badge/try-on%20gitpod-brightgreen.svg)](https://gitpod.io/#https://github.com/another-ai/embedbase)

# Embedbase

Open-source API to easily create, store, and retrieve embeddings.

[Don’t want to handle infra? We’re launching a hosted version soon. Just click here to be first to know when it comes out](https://yep.so/p/embedase?ref=github).

> Used by [AVA](https://github.com/louis030195/obsidian-ava) and serving ~100k requests a day.

## Example 

This example shows how you could use Embedbase to display the most similar documents.

e.g. tesla is most most similar to car in list`[dog, wolf, giraffe, car,robot]`

https://user-images.githubusercontent.com/25003283/216080514-9d40f912-7201-419e-80e3-11ad4fd52ac6.mov

[See code here](./examples/simple-react/README.md)

## Current Stack

* [openai embeddings](https://platform.openai.com/docs/guides/embeddings) for vectorization
* [pinecone](https://www.pinecone.io/) to store vectors & documents
* [fastapi](https://github.com/tiangolo/fastapi) 
* [firebase](https://firebase.google.com/) for auth (optional)


## Installation

### Prerequisite
* Pinecone account & one index
* Openai account

minimal `config.yaml` (see `config.example.yaml`)

```
# https://app.pinecone.io/
pinecone_index: "my index name"
# replace this with your environment
pinecone_environment: "us-east1-gcp"
pinecone_api_key: ""

# https://platform.openai.com/account/api-keys
openai_api_key: "sk-xxxxxxx"
# https://platform.openai.com/account/org-settings
openai_organization: "org-xxxxx"
```

### Docker

`docker-compose up`

## Usage

### Inserting data

```ts
const URL = 'http://localhost:8000'
const VAULT_ID = 'people'
fetch(`${URL}/v1/${VAULT_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documents: [{
        data: 'Elon is sipping a tea on Mars',
      }],
    }),
  });
```

### Searching

```ts
fetch(`${URL}/v1/${VAULT_ID}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'Something about a red planet',
    }),
  });
```

Result:

```json
{
  "query": "Something about a red planet",
  "similarities": [
    {
      "score": 0.828773,
      "id": "ABCU75FEBE",
      "data": "Elon is sipping a tea on Mars",
    }
  ]
}
```

## Customisation

### Authentication

Right now we just support simple firebase auth. We'll be adding more integrations as we go.

`config.yaml`
```yaml
auth: firebase
# make sure to have "service_account.json" at this path
firebase_service_account_path: ./service_account.json
```

[Get an **ID token** from your client](https://firebase.google.com/docs/auth/admin/verify-id-tokens#retrieve_id_tokens_on_clients)

```bash
TOKEN="foo"
const VAULT_ID = "people"
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"query": "Bob"}' http://localhost:8080/v1/${VAULT_ID}/search | jq '.'
```

You can only get ID tokens through Firebase client SDK, there is [an example to use authentication with React](https://github.com/another-ai/embedbase/tree/main/examples/simple-react-auth).

### Observability

You can use [sentry](https://sentry.io/welcome/) for error reporting. You can set your own sentry config in `config.yaml`

`config.yaml`
```yaml
sentry: YOUR_DSN
```

### Custom middleware

Currently adding middleware is very similar to [how it is done in FastAPI](https://fastapi.tiangolo.com/tutorial/middleware).

```py
# MYROOTPROJECT/middlewares/my_custom_middleware/my_custom_middleware.py
def middleware(app: FastAPI):
    @app.middleware("http")
    async def my_custom_middleware(request: Request, call_next) -> Tuple[str, str]:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
```

```dockerfile
# MYROOTPROJECT/Dockerfile
FROM ghcr.io/another-ai/embedbase:latest
# if you have some custom dependencies
# COPY requirements.txt requirements.txt
# RUN pip install -r requirements.txt && rm requirements.txt
COPY ./middlewares/my_custom_middleware/my_custom_middleware.py /app/middlewares/my_custom_middleware.py
```

```yaml
# MYROOTPROJECT/config.yaml
# ...
middlewares:
  - middlewares.my_custom_middleware
```


## Deployment

Please see [deployment](./docs/DEPLOYMENT.md) for more information.

[Don’t want to handle infra? We’re launching a hosted version soon. Just click here to be first to know when it comes out](https://yep.so/p/embedase?ref=github).


## To Do
- [x] add docker-compose ✅ 2023-02-01
- [ ] launch hosted version
- [ ] ability to use own storage middleware
- [ ] ability to use own auth middleare
- [x] document how to add custom sentry config
- [ ] add natural language search
