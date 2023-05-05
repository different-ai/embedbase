import { createClient } from 'embedbase-js'
import { EMBEDBASE_CLOUD_URL } from '@/utils/constants'
import { CreateContextResponse } from '@/utils/types'
import { get_encoding } from '@dqbd/tiktoken'
import * as Sentry from '@sentry/nextjs'
import { getEmbedbaseApp } from '@/lib/getEmbedbaseApp'
import { getApiKey } from '@/lib/getApiKey'

export const merge = async (chunks: string[], maxLen = 1800) => {
  let curLen = 0
  const tokenizer = get_encoding('cl100k_base')

  const context = []
  for (const chunk of chunks) {
    const nTokens = tokenizer.encode(chunk).length
    curLen += nTokens + 4
    if (curLen > maxLen) {
      break
    }
    context.push(chunk)
  }
  return context.join('\n\n###\n\n')
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
export default async function search(req: any, res: any) {
  const question = req.body.query
  if (!question) {
    res.status(400).json({ error: 'No query' })
    return
  }
  const publicApiKey = req.body.publicApiKey
  if (!publicApiKey) {
    res.status(400).json({ error: 'No apiKey' })
    return
  }
  const appData = await getEmbedbaseApp(publicApiKey)
  console.log(appData)
  // retrieve api key from public api key
  const apiKey = await getApiKey(appData.owner)
  const datasetIds = appData.datasets

  if (!datasetIds) {
    res.status(400).json({ error: 'No datasetIds' })
    return
  }

  // retrieve api key from public api key

  try {
    const context = await createContext(question, datasetIds, apiKey)
    res.status(200).json({ ...context, systemMessage: appData.system_message })
  } catch (error) {
    Sentry.captureException(error)
    res.status(500).json({ error: error.message })
  }
}
