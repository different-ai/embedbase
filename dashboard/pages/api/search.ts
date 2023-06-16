import cors from '@/utils/cors'
import { semanticSearch } from '@/utils/vectors'
import * as Sentry from '@sentry/nextjs'

export const config = {
  runtime: 'edge',
}

type SearchRequest = {
  query: string
  datasets_id: string[]
  top_k?: number
  where?: Record<string, any>
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

// 2. Get a context from a dataset
export default async function buildPrompt(req: Request, res: Response) {
  // The `cors` snippet says the preflight OPTIONS is handled, but it's not stable!
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: CORS_HEADERS,
    })
  }
  console.log('starting')
  const { query, datasets_id, top_k, where } =
    (await req.json()) as SearchRequest
  if (!query) {
    return new Response(JSON.stringify({ error: 'No query' }), {
      status: 400,
    })
  }

  const userId = req.headers.get('userId')
  console.log('userId', userId)

  try {
    const context = await semanticSearch(
      userId,
      datasets_id,
      query,
      where,
      top_k
    )

    console.log('done')
    return cors(
      req,
      new Response(JSON.stringify(context), {
        status: 200,
      })
    )
  } catch (error) {
    console.error(error)
    Sentry.captureException(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: CORS_HEADERS,
    })
  }
}
