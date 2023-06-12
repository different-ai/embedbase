import { semanticSearch } from '@/utils/vectors';
import * as Sentry from '@sentry/nextjs';

export const config = {
  runtime: 'edge',
}

type SearchRequest = {
  query: string;
  datasets_id: string[];
  top_k?: number;
  where?: Record<string, any>;
}

// 2. Get a context from a dataset
export default async function buildPrompt(req: Request, res: Response) {
  const { query, datasets_id, top_k, where } = await req.json() as SearchRequest
  if (!query) {
    return new Response(JSON.stringify({ error: 'No query' }), {
      status: 400,
    })
  }

  const userId = req.headers.get('userId')

  try {
    const context = await semanticSearch(userId, datasets_id, query, where, top_k)
    return new Response(JSON.stringify(context), {
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
