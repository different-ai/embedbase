export type Fetch = typeof fetch

export interface BatchAddDocument {
  data: string
  metadata?: Metadata | unknown
}

/**
 * The Metadata interface defines a structure for the basic metadata of a
 * document. It is best practice to use the path field to store the path of the
 * document chunk in order to get the reference to the original document.
 * The path is likely an publicly accessible URL, but it can be adapted
 * to your needs.
 * For the path, imagine https://perplexity.ai references.
 * You can also add any other metadata you want to store.
 *
 * @interface Metadata
 */
interface Metadata {
  path: string
  [key: string]: unknown
}

export interface SearchSimilarity {
  similiarity: number
  data: string
  embedding: number[]
  hash: string
  metadata?: Metadata | unknown
}

export interface SearchData {
  query: string
  similarities: SearchSimilarity[]
}

export interface SearchOptions {
  limit?: number
}

export interface AddDataResult {
  id: string
  data: string
  embedding: number[]
  hash: string
  metadata?: Metadata | unknown
}
export interface AddData {
  results?: AddDataResult[]
  error?: string
}

export type ClientContextData = string[]

export type ClientSearchData = SearchSimilarity[]
export interface ClientAddData {
  id?: string
  status: 'success' | 'error'
}

export interface ClientDatasets {
  datasetId: string
  documentsCount: number
}
