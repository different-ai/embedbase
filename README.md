<br />


<p align="center">
<img width="150" alt="embedbasevector" src="https://user-images.githubusercontent.com/11430621/223136025-14572cac-f2aa-455c-936b-a48cb35a0c57.png">
  <h1 align="center">Embedbase</h1>


<h3 align="center">The open source database for ChatGPT</h3>

  <p align="center">
    <br />
    <a href="https://badge.fury.io/py/embedbase"><img src="https://badge.fury.io/py/embedbase.svg" alt="PyPI version" height="18"></a>
    <p>Open-source sdk & api to easily connect data to ChatGPT</p>
    <p>Used by <a href="https://github.com/louis030195/obsidian-ava">AVA</a> and serving 100k request a day</p>
    <a href="https://app.embedbase.xyz/signup">Try the sandbox playground now</a>
    ·
    <a href="https://github.com/different-ai/embedbase/issues/new?assignees=&labels=enhancement">Request Feature</a>
    ·
    <a href="https://github.com/different-ai/embedbase/issues/new?assignees=&labels=bug">Report Bug</a>
    ·
    <a href="https://discord.gg/pMNeuGrDky">Join our Discord</a>
    <br />
  </p>
</p>

Check out the [docs](https://docs.embedbase.xyz) for more info.


## Table of Contents

- [Javascript SDK](#sdk)
- [What are people building with Embedbase?](#what-are-people-building)
- [Docs and support](#docs-and-support)
- [Contributing](#contributing)
- [Open-source vs hosted](#open-source-vs-hosted)

## What are people building

- [ChatGPT-powered search for markdown documentation](https://github.com/different-ai/chat-gpt-powered-nextra)
- [AVA uses Embedbase to help their users find related notes](https://github.com/louis030195/obsidian-ava)

## Embedbase Flavours

### As a library

```py
from embedbase import get_app

from embedbase.settings import Settings
from embedbase.supabase_db import Supabase

settings = Settings(
    # your config goes here, or use "get_settings" helper to use a config.yaml
)

app = (
    get_app(settings)
    # we use supabase.com as db here, but pick your favourite one
    .use(Supabase(settings.supabase_url, settings.supabase_key))
).run()
```

### Docker

Deploy an instance in one line with Docker:

 ```bash 
docker-compose up
 ``` 


### Managed Instance

The fastest way to get started with Embedbase is signing up for free to [Embedbase Cloud](https://app.embedbase.xyz/).

## How to use 
### SDK

`npm i embedbase-js`

```js
import { createClient } from 'embedbase-js'

const question = 'What can I do with Embedbase API?'

const embedbase = createClient(
  'https://api.embedbase.xyz',
  'api-key')

const context = await embedbase
.dataset('embedbase-docs')
.createContext('What can I do with Embedbase API?', { limit: 3 });

console.log(context) 
[
  "Embedbase API allows to store unstructured data...",
  "Embedbase API has 3 main functions a) provides a plug and play solution to store embeddings b) makes it easy to connect to get the right data into llms c)..",
  "Embedabase API is self-hostable...",
]

// refer to https://github.com/openai/openai-node for the exact api
openai.createCompletion(
  `Write a response to question: ${question} 
  based on the follwing context ${context.toString()}`
)
// answer:
// You can use the Embedbase API to store unstructured data and then use the data to connect it to LLMs
```



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

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/different-ai/embedbase)

We recommend using Gitpod for development.

Make sure to add a variable in your [Gitpod dashboard](https://gitpod.io/user/variables) `EMBEDBASE_CONFIG`as a JSON value.

> To create a json from yaml: `yq -o=json eval config.yaml` or `cat config.yaml | yq` depending on your `yq` version

### Current Stack

* Embeddings
  - [x] [openai embeddings](https://platform.openai.com/docs/guides/embeddings)
  - [ ] [cohere embeddings](https://cohere.ai/embed)
  - [ ] [Google PaLM embeddings](https://developers.googleblog.com/2023/03/announcing-palm-api-and-makersuite.html)
  - [ ] local (BERT, etc.)
* Vector database
  - [x] [supabase](https://supabase.com/)
  - [ ] [pinecone](https://www.pinecone.io/)
  - [ ] local (sqlite, etc.)
* [fastapi](https://github.com/tiangolo/fastapi)
* Authentication (optional)
  - [x] [firebase](https://firebase.google.com/)
  - [ ] [supabase](https://supabase.com/)

### Configuration

#### Prerequisite
* Supabase account & [database configured](https://docs.embedbase.xyz/deployment#using-supabase)
* Openai account

minimal `config.yaml` (see `config.example.yaml`)

```yaml
vector_database: supabase # or pinecone

supabase_url: <get me here https://supabase.com>
supabase_key: <get me here https://supabase.com>

# https://platform.openai.com/account/api-keys
openai_api_key: "sk-xxxxxxx"
# https://platform.openai.com/account/org-settings
openai_organization: "org-xxxxx"
```

#### Python

To run a `uvicorn server` that automatically reloads on code changes:

`make run`

#### Docker

`docker-compose up`


## Open-source vs hosted

This repo is available under the [MIT license](https://github.com/different-ai/embedbase/blob/main/LICENSE). 

To learn more, [book a demo](https://cal.com/potato/20min).

