⚠️ Alpha version 

**There are ongoing efforts to make it more modular and easy to use**


# Embedbase

Open-source API for to easily create, store, and retrieve embeddings.

You can join the waitlist to make use of the hosted version [here](https://yep.so/p/embedase)


> Used by [AVA](https://github.com/louis030195/obsidian-ava) and serving ~100k requests a day.

## Current Stack

* [openai embeddings](https://platform.openai.com/docs/guides/embeddings) for vecotrization
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

## Authorization

Right now we just support simple firebase auth. We'll be adding more integrations as we go.

`config.yaml`
```
auth: simple_firebase
## example
firebase_service_account_path './service_account.json'
```

[Get an **ID token** from your client](https://firebase.google.com/docs/auth/admin/verify-id-tokens#retrieve_id_tokens_on_clients)

```bash
TOKEN="foo"
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"vault_id": "dev", "query": "Bob"}' http://localhost:8080/v1/search | jq '.'
```

## Deployment

Please see [deployment](./docs/DEPLOYMENT.md) for more information.


## To Do
- [x] add docker-compose ✅ 2023-02-01
- [ ] launch hosted version
- [ ] ability to use own storage middleware
- [ ] ability to use own auth middleare
- [ ] document how to add custom sentry config
- [ ] release sync sdk
