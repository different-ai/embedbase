import EmbedbaseClient from './EmbedbaseClient'

export { default as EmbedbaseClient } from './EmbedbaseClient'
export {
  BatchAddDocument,
  ClientContextData,
  ClientDatasets,
  ClientSearchData,
  ClientSearchResponse,
  Document,
  EmbedbaseClientOptions,
  Fetch,
  GenerateOptions,
  Metadata,
  RangeOptions,
  Role,
  SearchData,
  SearchSimilarity,
  SearchOptions,
  UpdateDocument,
} from './types'
/**
 * Creates a new Embedbase Client.
 */
export const createClient = (embedbaseUrl: string, embedbaseKey?: string) => {
  return new EmbedbaseClient(embedbaseUrl, embedbaseKey)
}

export { merge, splitText } from './split'
