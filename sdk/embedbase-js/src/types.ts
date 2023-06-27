export type Fetch = typeof fetch

export interface EmbedbaseClientOptions {
  browser: boolean
}

export interface BatchAddDocument {
  data: string
  metadata?: Metadata
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
export interface Metadata {
  path?: string
  [key: string]: any
}

export interface SearchSimilarity extends Document {
  score: number
}

export interface SearchData {
  query: string
  similarities: SearchSimilarity[]
}

export interface SearchOptions {
  limit?: number
  where?: object
  url?: string
}

export interface CreateContextOptions {
  limit?: number
  url?: string
}

export interface Document {
  id: string
  data: string
  embedding: number[]
  hash: string
  metadata?: Metadata
  public: boolean
}
export interface AddData {
  results?: Document[]
  error?: string
}

export type ClientContextData = string[]

export type ClientSearchData = SearchSimilarity[]

export interface ClientDatasets {
  datasetId: string
  documentsCount: number
  public: boolean
}

export type LLM = 'openai/gpt-4' | 'openai/gpt-3.5-turbo-16k' | 'google/bison' | 'bigscience/bloomz-7b1' //| 'tiiuae/falcon-7b'

export interface LLMDescription {
  name: LLM
  description: string
}

export interface RangeOptions {
  offset: number
  limit: number
}

export interface UpdateDocument {
  id: string
  data?: string
  metadata?: Metadata
}

interface WebAnswer {
  id?: string;
  someResultsRemoved: boolean;
  totalEstimatedMatches: number;
  value: WebPage[];
  webSearchUrl: string;
}

interface WebPage {
  about?: any[]
  dateLastCrawled: string
  contractualRules?: any[]
  deepLinks?: WebPage[];
  displayUrl: string
  id?: string
  isFamilyFriendly: boolean
  isNavigational: boolean
  language: string
  malware?: Malware
  name: string
  mentions?: any
  searchTags?: MetaTag[]
  snippet: string
  url: string
}

interface Malware {
  // Malware specific properties go here
}

interface MetaTag {
  name: string
  content: string
}

export interface SearchResponse {
  webPages: WebAnswer
}

export interface ClientSearchResponse {
  title: string
  url: string
  snippet: string
}


export interface GenerateOptions {
  maxNewTokens?: number;
  stop?: string[];
}
