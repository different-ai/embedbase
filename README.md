# Embedbase

Supabase for embeddings.

**The open-source API for storing & retrieving embeddings.**

Easily search images, audio, and text alike - in a single api call.

## Installation

`config.yaml`
```
pinecone_api_key: ...
openai_api_key: ...
openai_organization: ...
```

### Baremetal

1. `make install`
2. `make run`

### Docker

1. `make docker/run`

## Usage

```bash
# inserting/updating a document
curl -X POST -H "Content-Type: application/json" -d '{"vault_id": "dev", "documents": [{"document_path": "Bob.md", "document_tags": ["Humans", "Bob"], "document_content": "Bob is a human.", "document_embedding_format": "File:\nBob.md\nContent:\nBob is a human."}]}' http://localhost:8080/v1/search/refresh | jq '.'
{
  "status": "success",
  "ignored_hashes": []
}


# searching
curl -X POST -H "Content-Type: application/json" -d '{"vault_id": "dev", "query": "Bob"}' http://localhost:8080/v1/search | jq '.'
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
curl -X POST -H "Content-Type: application/json" -d '{"vault_id": "dev", "documents": [{"document_to_delete": "Bob.md"}]}' http://localhost:8080/v1/search/refresh | jq '.'
{
  "status": "success",
}
```

## Releasing

1. bump `service.prod.yaml` Docker image tag  
  ⚠️ Ensure there is no "dev" in the tag, i.e. `gcr.io/obsidian-ai/obsidian-search:0.0.7` ⚠️
2. Push your code to `main`

## Deployment

Please see [deployment](./docs/DEPLOYMENT.md) for more information.
