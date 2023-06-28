<br />


<p align="center">
<img width="150" alt="embedbasevector" src="https://github.com/different-ai/embedbase/assets/11430621/a04174fa-1c0a-4737-9e83-8cfd74f1c16d">
  <h1 align="center">Embedbase</h1>


<h3 align="center">All the tools you need to develop AI apps</h3>

  <p align="center">
    <br />
    <a href="https://discord.gg/pMNeuGrDky"><img alt="Discord" src="https://img.shields.io/discord/1066022656845025310?color=black&style=for-the-badge"></a>
    <a href="https://badge.fury.io/py/embedbase"><img alt="PyPI" src="https://img.shields.io/pypi/v/embedbase?color=black&style=for-the-badge"></a>
    <br />
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
import { createClient } from 'embedbase-js'
// initialize client
const embedbase = createClient(
  'https://api.embedbase.xyz',
  '<grab me here https://app.embedbase.xyz/>'
)
 
const question =
  'im looking for a nice pant that is comfortable and i can both use for work and for climbing'
 
// search for information in a pre-defined dataset and returns the most relevant data
const searchResults = await embedbase.dataset('product-ads').search(question)
 
// transform the results into a string so they can be easily used inside a prompt
const stringifiedSearchResults = searchResults
  .map(result => result.data)
  .join('')
 
const answer = await embedbase
  .useModel('openai/gpt-3.5-turbo-16k')
  .generateText(`${stringifiedSearchResults} ${question}`)
 
console.log(answer) // 'I suggest considering harem pants for your needs. Harem pants are known for their ...'
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

