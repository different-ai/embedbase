<br />


<p align="center">
<img width="150" alt="embedbasevector" src="https://user-images.githubusercontent.com/11430621/223136025-14572cac-f2aa-455c-936b-a48cb35a0c57.png">
  <h1 align="center">Embedbase</h1>


<h3 align="center">Seamless data integration for LLMs</h3>

  <p align="center">
    <br />
    <a href="https://discord.gg/pMNeuGrDky"><img alt="Discord" src="https://img.shields.io/discord/1066022656845025310?color=black&style=for-the-badge"></a>
    <a href="https://badge.fury.io/py/embedbase"><img alt="PyPI" src="https://img.shields.io/pypi/v/embedbase?color=black&style=for-the-badge"></a>
    <br />
    <a target="_blank" href="https://colab.research.google.com/github/different-ai/embedbase/blob/main/notebooks/Embedbase_Getting_started.ipynb">
      <img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/>
    </a>
    <p align="center">Open-source API & SDK to integrate your data and easily hook them up to LLMs</p>
    <p align="center">Used by <a href="https://github.com/louis030195/obsidian-ava">AVA</a> and serving 100k request a day</p>
    <div align="center">
      <a href="https://app.embedbase.xyz/signup">Try the Hosted Version</a>
      ·
      <a href="https://github.com/different-ai/embedbase/issues/new?assignees=&labels=enhancement">Request Feature</a>
      ·
      <a href="https://github.com/different-ai/embedbase/issues/new?assignees=&labels=bug">Report Bug</a>
    </div>
    <br />
  </p>
</p>

Check out the [docs](https://docs.embedbase.xyz) for more info.

## What is it

Embedbase is a dead-simple API to help you use [VectorDBs](https://learn.microsoft.com/en-us/semantic-kernel/concepts-ai/vectordb) and [Embeddings Models](https://en.wikipedia.org/wiki/Sentence_embedding#:~:text=Sentence%20embedding%20is%20the%20collective,to%20vectors%20of%20real%20numbers.) without needing to host them!
You can use embedbase to customize LLM (like ChatGPT!) and automatically feed them the right information.

## Installation
`npm i embedbase-js`

```js
// this examples shows how you can use embedbase to automatically add context in a ChatGPT prompt
import { createClient } from 'embedbase-js'

const question = 'What can I do with Embedbase API?'

const embedbase = createClient(
  'https://api.embedbase.xyz',
  'api-key')

const context = await embedbase
.dataset('my-documentation')
.createContext(question);

console.log(context)
/* [
  "Embedbase API allows to store unstructured data...",
  "Embedbase API has 3 main functions a) provides a plug and play solution to store embeddings b) makes it easy to connect to get the right data into llms c)..",
  "Embedabase API is self-hostable...",
] */


const prompt =
`Based on the following context:\n${context.join()}\nAnswer the user's question: ${question}`

// for await allows you to stream answers
for await (const res of embedbase.generate(prompt)) {
    console.log(res)
    // You, can, use, ...
}
// answer:
// You can use the Embedbase API to store unstructured data and then use the data to connect it to LLMs
```

## Table of Contents

- [Getting started](#getting-started)
- [Javascript SDK](#sdk)
- [Docs and support](#docs-and-support)
- [Integrations](#our-integrations)
- [Contributing](#contributing)


## What are people building

- [Recommendation Engines: AVA uses Embedbase to help their users find related notes](https://github.com/louis030195/obsidian-ava)
- [Chat with your data: Solpilot uses Embedbase to put smart contract integration on autopilot](https://app.solpilot.xyz/chat)
- [Talk to your docs: ChatGPT-powered search for markdown documentation](https://github.com/different-ai/chat-gpt-powered-nextra)



The fastest way to get started with Embedbase is signing up for free to [Embedbase Cloud](https://app.embedbase.xyz/).

![Dashboard Screenshot](https://user-images.githubusercontent.com/11430621/227351386-f540fac0-c5fa-485a-bcc9-f23368fe3f63.png)



## Supported Integrations

### Connections
- [x] Any data with the sdk or api
- [x] PDF
- [ ] Github

### Vector DBs
- [x] Supabase
- [x] Postgres
- [x] Qdrant
- [ ] Weaviate
- [ ] Redis

### Embedding Models
- [x] OpenAI Embeddings
- [x] sentence-transformers
- [ ] T5




## Docs and support

Check out our [tutorials](https://docs.embedbase.xyz) for step-by-step guides, how-to's, and best practices, our documentation is powered by GPT-4, so you can ask question directly. 

Ask a question in our [Discord community](https://discord.gg/pMNeuGrDky) to get support.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Self-hosting

> Note: this render configuration works well for experimentation. 

<a href="https://render.com/deploy?repo=https://github.com/different-ai/embedbase-render">
      <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render">
</a>
