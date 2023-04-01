<br />


<p align="center">
<img width="150" alt="embedbasevector" src="https://user-images.githubusercontent.com/11430621/223136025-14572cac-f2aa-455c-936b-a48cb35a0c57.png">
  <h1 align="center">Embedbase</h1>


<h3 align="center">An API to easily connect your data to ChatGPT</h3>

  <p align="center">
    <br />
    <a href="https://discord.gg/pMNeuGrDky"><img alt="Discord" src="https://img.shields.io/discord/1066022656845025310?color=black&style=for-the-badge"></a>
    <a href="https://badge.fury.io/py/embedbase"><img alt="PyPI" src="https://img.shields.io/pypi/v/embedbase?color=black&style=for-the-badge"></a>
    <p>Open-source sdk & api to easily connect data to ChatGPT</p>
    <p>Used by <a href="https://github.com/louis030195/obsidian-ava">AVA</a> and serving 100k request a day</p>
    <a href="https://app.embedbase.xyz/signup">Try the sandbox playground now</a>
    ·
    <a href="https://github.com/different-ai/embedbase/issues/new?assignees=&labels=enhancement">Request Feature</a>
    ·
    <a href="https://github.com/different-ai/embedbase/issues/new?assignees=&labels=bug">Report Bug</a>
    <br />
  </p>
</p>

Check out the [docs](https://docs.embedbase.xyz) for more info.


## Table of Contents

- [Getting started](#getting-started)
- [Javascript SDK](#sdk)
- [Docs and support](#docs-and-support)
- [Contributing](#contributing)

## What are people building

- [AVA uses Embedbase to help their users find related notes](https://github.com/louis030195/obsidian-ava)
- [Solpilot uses Embedbase to put smart contract integration on autopilot](https://solpilot.xyz/)
- [ChatGPT-powered search for markdown documentation](https://github.com/different-ai/chat-gpt-powered-nextra)

## Getting started

```bash
# start local postgres
docker-compose up
```

```py
from embedbase import get_app

from embedbase.database.postgres_db import Postgres
from embedbase.embedding.openai import OpenAI
 
async def custom_middleware(request, call_next):
    # customise as you prefer :)
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    return response
 
app = (
    get_app()
    .use_middleware(custom_middleware)
    .use_embedder(OpenAI("<your key>"))
    .use_db(Postgres())
).run()
```

```
uvicorn main:app
```

🔥 Embedbase now runs! [Time to ship your product](#sdk)


### Managed Instance

The fastest way to get started with Embedbase is signing up for free to [Embedbase Cloud](https://app.embedbase.xyz/).

![Dashboard Screenshot](https://user-images.githubusercontent.com/11430621/227351386-f540fac0-c5fa-485a-bcc9-f23368fe3f63.png)


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

Check out our [tutorials](https://docs.embedbase.xyz) for step-by-step guides, how-to's, and best practices, our documentation is powered by GPT-4, so you can ask question directly. 

Ask a question in our [Discord community](https://discord.gg/pMNeuGrDky) to get support.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.
