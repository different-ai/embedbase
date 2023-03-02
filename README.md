<br />
<p align="center">
  <h1 align="center">Embedbase</h1>
<h3 align="center">Get your embeddings-powered app off localhost</h3>

  <p align="center">
    <br />
    <p>Free and open-source API to easily create, store, and retrieve embeddings.</p>
    <p>Used by <a href="https://github.com/louis030195/obsidian-ava">AVA</a> and serving 100k request a day</p>
    <a href="https://app.embedbase.xyz/signup">Try the sandbox playground now</a>
    ·
    <a href="https://github.com/another-ai/embedbase/issues/new?assignees=&labels=enhancement">Request Feature</a>
    ·
    <a href="https://github.com/another-ai/embedbase/issues/new?assignees=&labels=bug">Report Bug</a>
    <br />
  </p>
</p>

Check out the [docs](https://docs.embedbase.xyz) for more info.

## Table of Contents

- [Get started for free](#get-started-for-free)
- [Docs and support](#docs-and-support)
- [Contributing](#contributing)
<!-- TODO: - [Open-source vs hosted](#open-source-vs-hosted) -->

## Get started for free

### Embedbase Cloud

The fastest and most reliable way to get started with Embedbase is signing up for free to [Embedbase Cloud](https://app.embedbase.xyz/signup).

### Open-source hobby deploy

Deploy a hobby instance in one line with Docker:

 ```bash 
docker-compose up
 ``` 

Good for local development. See our [docs for more info on self-hosting](./docs/DEPLOYMENT.md).

### Inserting data

```ts
const URL = 'http://localhost:8000'
const VAULT_ID = 'people'
// if using the hosted version
const API_KEY = '<https://app.embedbase.xyz/signup>'
fetch(`${URL}/v1/${VAULT_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // if using the hosted version, uncomment
      // 'Authorization': `Bearer ${API_KEY}`
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
      // 'Authorization': `Bearer ${API_KEY}`
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

## Docs and support

Check out our [tutorials](https://docs.embedbase.xyz) for step-by-step guides, how-to's, and best practices.

Ask a question in our [Discord community](https://discord.gg/DYE6VFTJET) to get support.

## Contributing

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/another-ai/embedbase)

We recommend using Gitpod for development.

Make sure to add a variable in your [Gitpod dashboard](https://gitpod.io/user/variables) `EMBEDBASE_CONFIG`as a JSON value.

> To create a json from yaml: `yq -o=json eval config.yaml`

### Current Stack

* [openai embeddings](https://platform.openai.com/docs/guides/embeddings) for vectorization
* [pinecone](https://www.pinecone.io/) to store vectors & documents
* [fastapi](https://github.com/tiangolo/fastapi) 
* [firebase](https://firebase.google.com/) for auth (optional)

### Installation

#### Prerequisite
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

#### Docker

`docker-compose up`


### Customisation

#### Authentication

Right now, we just support simple firebase auth. We'll be adding more integrations as we go.

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

#### Observability

You can use [sentry](https://sentry.io/welcome/) for error reporting. You can set your own sentry config in `config.yaml`

`config.yaml`
```yaml
sentry: YOUR_DSN
```

#### Custom middleware

Example production middlewares:

- Playground Embedbase instance is [open source](https://github.com/another-ai/embedbase-hosted)
- [Embedbase-ava](https://github.com/another-ai/embedbase-ava) serve hundreds of thousands of requests per day to [Obsidian users](https://app.anotherai.co/)

Currently adding middleware is very similar to [how it is done in FastAPI](https://fastapi.tiangolo.com/tutorial/middleware).

```py
# MYROOTPROJECT/middlewares/my_custom_middleware/my_custom_middleware.py
class MyCustomMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Tuple[str, str]:
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
  - middlewares.my_custom_middleware.my_custom_middleware.MyCustomMiddleware
```

```bash
curl -X POST -H "Content-Type: application/json" -d '{"query": "Bob"}' http://localhost:8080/v1/people/search | jq '.'
```

```json
{
  "query": "Bob",
  "similarities": [
    {
      "score": 0.828773,
      "id": "ABCU75FEBE",
      "data": "Elon is sipping a tea on Mars",
    }
  ],
  "headers": {
    "x-process-time": "0.0001239776611328125"
  }
}
```

Please see [examples](./examples/simple-react-custom-middleware) for more details and a concrete example.

<!--
TODO
## Open-source vs. hosted

This repo is available under the [MIT expat license](https://github.com/another-ai/embedbase/blob/master/LICENSE). 

To learn more, [book a demo](https://cal.com/potato/20min).
-->
