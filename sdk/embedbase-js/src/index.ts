import EmbedbaseClient from './EmbedbaseClient'
import EmbedbaseExperimentalClient from './EmbedbaseExperimentalClient'

export { default as EmbedbaseClient } from './EmbedbaseClient'
export { default as EmbedbaseExperimentalClient } from './EmbedbaseExperimentalClient'
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

/**
 * Creates a new experimental Embedbase Client.
 * This client is not recommended for production use.
 */
export const createExperimentalClient = (embedbaseUrl: string, embedbaseKey?: string) => {
  return new EmbedbaseExperimentalClient(embedbaseUrl, embedbaseKey)
}

export { merge, splitText } from './split'
