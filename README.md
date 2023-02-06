⚠️ Alpha version 

**There are ongoing efforts to make it more modular and easy to use**


# Embedbase

Open-source API for to easily create, store, and retrieve embeddings.

You can join the waitlist to make use of the hosted version [here](https://yep.so/p/embedase)


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
fetch(`${URL}/v1/search/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vault_id: 'dev',
      documents: [{
        document_id: 'Elon',
        document_path: 'Elon',
        document_content: 'Elon is sipping a tea on Mars',
        document_tags: ['mars', 'space'],
        document_embedding_format: 'Doc:\Elon\nContent:\Elon is sipping a tea on Mars',
      }],
    }),
  });
}
```

### Searching

```ts
fetch(`${URL}/v1/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vault_id: 'dev',
      query: 'Something about a red planet',
    }),
  });
}
```

Result:

```json
{
  "query": "Something about a red planet",
  "similarities": [
    {
      "score": 0.828773,
      "document_id": "Elon",
      "document_path": "Elon",
      "document_content": "Elon is sipping a tea on Mars",
      "document_tags": [
        "mars",
        "space"
      ],
    }
  ]
}
```

### Delete

```ts
fetch(`${URL}/v1/search/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vault_id: 'dev',
      documents: [{
        document_to_delete: 'Elon',
      }],
    }),
  });
}
```

<details>
  <summary>Equivalent in Bash</summary>
  
```bash
# inserting/updating a document
curl -X POST -H "Content-Type: application/json" -d '{"vault_id": "dev", "documents": [{"document_path": "Bob.md", "document_tags": ["Humans", "Bob"], "document_content": "Bob is a human.", "document_embedding_format": "File:\nBob.md\nContent:\nBob is a human."}]}' http://localhost:8000/v1/search/refresh | jq '.'
{
  "status": "success",
  "ignored_hashes": []
}


# searching
curl -X POST -H "Content-Type: application/json" -d '{"vault_id": "dev", "query": "Bob"}' http://localhost:8000/v1/search | jq '.'
{
  "query": "Bob",
  "similarities": [
    {
      "score": 0.828773,
      "document_id": "Bob.md",
      "document_path": "Bob.md",
      "document_content": "Bob is a human.",
      "document_tags": [
        "Humans",
        "Bob"
      ],
    }
  ]
}

# deleting a document
curl -X POST -H "Content-Type: application/json" -d '{"vault_id": "dev", "documents": [{"document_to_delete": "Bob.md"}]}' http://localhost:8000/v1/search/refresh | jq '.'
{
  "status": "success",
}
```

</details>


## Authorization

Right now we just support simple firebase auth. We'll be adding more integrations as we go.

`config.yaml`
```
authentication: firebase
firebase_service_account_path ./service_account.json
```

[Get an **ID token** from your client](https://firebase.google.com/docs/auth/admin/verify-id-tokens#retrieve_id_tokens_on_clients)

```bash
TOKEN="foo"
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"vault_id": "dev", "query": "Bob"}' http://localhost:8080/v1/search | jq '.'
```

You can only get ID tokens through Firebase client SDK, there is [an example to use authentication with React](https://github.com/another-ai/embedbase/tree/main/examples/simple-react-auth).

## Deployment

Please see [deployment](./docs/DEPLOYMENT.md) for more information.


## To Do
- [x] add docker-compose ✅ 2023-02-01
- [ ] launch hosted version
- [ ] ability to use own storage middleware
- [ ] ability to use own auth middleare
- [ ] document how to add custom sentry config
- [ ] release sync sdk
- [ ] add natural language search
