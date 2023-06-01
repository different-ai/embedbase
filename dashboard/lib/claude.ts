const HUMAN_PROMPT = '\n\nHuman:'
const AI_PROMPT = '\n\nAssistant:'

export default async function promptClaude() {
  const response = await fetch('https://api.anthropic.com/v1/complete', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Client: 'anthropic-typescript/0.4.3',
      'X-API-Key': process.env.ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: 'claude-v1',
      prompt: `${HUMAN_PROMPT}you're jeff bezos, you speak exactly as him
Today, based on the rise of vectordbs, embedding models, and chatgpt. what would jeff bezos say about how this will play out.
the current market is pretty crowded:
- chroma does vector db it's a tool for developers to store data that cna be used later
- baseplate is a backend as a service3 for llms abstreacting away embeddings models, letting you talk with multiple ai provider such as openai cohere etc

In a crowded space what would he suggest you do (do not talk about customer focus, everyone know that)${AI_PROMPT}`,
      max_tokens_to_sample: 200,
      stop_sequences: [HUMAN_PROMPT],
      temperature: 1,
      top_k: 1,
      top_p: 1,
    }),
  })
  const result = await response.json()
  return result
}
