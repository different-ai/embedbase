import { createClient, merge } from 'embedbase-js'
import { EMBEDBASE_CLOUD_URL } from '../../utils/constants'
import { CreateContextResponse } from '../../utils/types'
import * as Sentry from '@sentry/nextjs'

export const config = {
  runtime: 'edge',
}

const createContext = async (
  question: string,
  datasetIds: string[],
  apiKey: string
): Promise<CreateContextResponse> => {
  const embedbase = createClient(EMBEDBASE_CLOUD_URL, apiKey)
  const results = await Promise.all(
    datasetIds.map(async (datasetId) =>
      embedbase.dataset(datasetId).search(question, { limit: 10 })
    )
  )

  const similarities = results.flatMap((r) => r)

  const topResults = similarities.sort(() => Math.random() - 0.5).slice(0, 15)
  // if the dataset has been indexed
  // using path in the metadata,
  // we can return the reference
  // as a stringified JSON object
  // otherwise, we return the data string
  const datas = topResults.map((r: any) => {
    if (r?.metadata?.path) {
      return JSON.stringify({
        data: r.data,
        reference: r.metadata.path,
      })
    }
    return r.data
  })
  const chunkedContext = await merge(datas)
  return { chunkedContext: chunkedContext, contexts: topResults }
}

// 2. Get a context from a dataset
export default async function buildPrompt(req: Request, res: Response) {
  const { prompt, datasetIds, apiKey } = await req.json()
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'No prompt' }), {
      status: 400,
    })
  }
  if (!datasetIds) {
    return new Response(JSON.stringify({ error: 'No datasetIds' }), {
      status: 400,
    })
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'No apiKey' }), {
      status: 400,
    })
  }

  try {
    const context = await createContext(prompt, datasetIds, apiKey)
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
