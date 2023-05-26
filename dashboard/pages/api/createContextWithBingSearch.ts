import * as Sentry from '@sentry/nextjs'
import { createClient, merge } from 'embedbase-js'
import { EMBEDBASE_CLOUD_URL } from '../../utils/constants'

export const config = {
  runtime: 'edge',
}

type CreateContextRequest = {
  prompt: string
  apiKey: string
}
const formatInternetResultsInPrompt = (internetResult: any) =>
    `Name: ${internetResult.title}
Snippet: ${internetResult.snippet}
Url: ${internetResult.url}`

// 2. Get a context from bing search
export default async function buildPrompt(req: Request, res: Response) {
  const { prompt, apiKey } = await req.json() as CreateContextRequest
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'No prompt' }), {
      status: 400,
    })
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'No apiKey' }), {
      status: 400,
    })
  }

  try {
    const embedbase = createClient(EMBEDBASE_CLOUD_URL, apiKey)
    const results = await embedbase.internetSearch(prompt)

    const chunkedContext = await merge(results.map(formatInternetResultsInPrompt))

    return new Response(JSON.stringify({ chunkedContext: chunkedContext, 
      contexts: results.map((r) => ({metadata: {
        path: r.url
      }})) }), {
      status: 200,
    })
  } catch (error) {
    console.error(error)
    Sentry.captureException(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    })
  }
}
