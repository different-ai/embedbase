<br />

<img width="150" alt="embedbasevector" src="https://user-images.githubusercontent.com/11430621/223136025-14572cac-f2aa-455c-936b-a48cb35a0c57.png">
<p align="center">
  <h1 align="center">Embedbase</h1>


<h3 align="center">The open source database for ChatGPT</h3>

  <p align="center">
    <br />
    <p>Open-source sdk & api to easily connect data to ChatGPT</p>
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

- [Docs and support](#docs-and-support)
- [Contributing](#contributing)
- [What are people building with Embedbase?](#what-are-people-building)
- [Open-source vs hosted](#open-source-vs-hosted)

## What are people building

- [Chat-GPT-powered search for markdown documentation]([https://differentai.gumroad.com/l/chatgpt-documentation](https://github.com/different-ai/chat-gpt-powered-nextra))
- [AVA uses Embedbase to help their users find related notes](https://github.com/louis030195/obsidian-ava)

## Embedbase Flavours

### Self-hosted

Deploy a hobby instance in one line with Docker:

 ```bash 
docker-compose up
 ``` 


### Managed Instance

The fastest way to get started with Embedbase is signing up for free to [Embedbase Cloud](https://app.embedbase.xyz/).


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

Check out our [tutorials](https://docs.embedbase.xyz) for step-by-step guides, how-to's, and best practices, our documentation is powered by ChatGPT, so you can ask question directly. 

Ask a question in our [Discord community](https://discord.gg/pMNeuGrDky) to get support.

## Contributing

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/another-ai/embedbase)

We recommend using Gitpod for development.

Make sure to add a variable in your [Gitpod dashboard](https://gitpod.io/user/variables) `EMBEDBASE_CONFIG`as a JSON value.

> To create a json from yaml: `yq -o=json eval config.yaml` or `cat config.yaml | yq` depending on your `yq` version

### Current Stack

* Embeddings
  - [x] [openai embeddings](https://platform.openai.com/docs/guides/embeddings) for vectorization
  - [ ] local (BERT, etc.)
* Vector database
  - [x] [supabase](https://supabase.com/)
  - [x] [pinecone](https://www.pinecone.io/)
  - [ ] local (sqlite, etc.)
* [fastapi](https://github.com/tiangolo/fastapi)
* Authentication (optional)
  - [x] [firebase](https://firebase.google.com/)
  - [ ] [supabase](https://supabase.com/)

### Configuration

#### Prerequisite
* Either
  * Supabase account & [database configured](https://docs.embedbase.xyz/deployment#using-supabase)
  * Pinecone account & one index
* Openai account

minimal `config.yaml` (see `config.example.yaml`)

```yaml
vector_database: supabase # or pinecone

supabase_url: <get me here https://supabase.com>
supabase_key: <get me here https://supabase.com>
# or
pinecone_index: "<get me here https://app.pinecone.io>"
pinecone_environment: "<get me here https://app.pinecone.io>"
pinecone_api_key: "<get me here https://app.pinecone.io>"

# https://platform.openai.com/account/api-keys
openai_api_key: "sk-xxxxxxx"
# https://platform.openai.com/account/org-settings
openai_organization: "org-xxxxx"
```

#### Docker

`docker-compose up`


## Open-source vs hosted

This repo is available under the [MIT license](https://github.com/another-ai/embedbase/blob/master/LICENSE). 

To learn more, [book a demo](https://cal.com/potato/20min).

