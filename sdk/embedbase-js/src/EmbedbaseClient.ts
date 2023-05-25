import type {
  BatchAddDocument,
  ClientContextData,
  ClientDatasets,
  ClientSearchData,
  Document,
  GenerateOptions,
  Metadata,
  RangeOptions,
  SearchData,
  SearchOptions,
  UpdateDocument
} from './types';
import { CustomAsyncGenerator, camelize, getFetch, stream } from './utils';


let fetch = getFetch();

class SearchBuilder implements PromiseLike<ClientSearchData> {
  constructor(
    private client: EmbedbaseClient,
    private dataset: string,
    private query: string,
    private options: SearchOptions = {}
  ) { }

  async search(): Promise<ClientSearchData> {
    const top_k = this.options.limit || 5
    const searchUrl = `${this.client.embedbaseApiUrl}/${this.dataset}/search`

    const requestBody: {
      query: string
      top_k: number
      where?: object
    } = { query: this.query, top_k };

    if (this.options.where) {
      requestBody.where = this.options.where;
    }

    const res: Response = await fetch(searchUrl, {
      method: 'POST',
      headers: this.client.headers,
      body: JSON.stringify(requestBody),
    })
    const data: SearchData = await res.json()

    return data.similarities;
  }

  where(field: string, operator: string, value: any): SearchBuilder {
    // this.options.where = { [field]: { [operator]: value } };
    this.options.where = {};
    this.options.where[field] = value;
    return this;
  }

  then<TResult1 = ClientSearchData, TResult2 = never>(
    onfulfilled?: ((value: ClientSearchData) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.search().then(onfulfilled, onrejected);
  }
}

class ListBuilder implements PromiseLike<Document[]> {
  constructor(
    private client: EmbedbaseClient,
    private dataset: string,
    private options: RangeOptions = {
      offset: 0,
      limit: 10
    }
  ) { }

  async list(): Promise<Document[]> {
    const listUrl = `${this.client.embedbaseApiUrl}/${this.dataset}?offset=${this.options.offset}&limit=${this.options.limit}`
    const res: Response = await fetch(listUrl, {
      method: 'GET',
      headers: this.client.headers,
    })
    const data: { documents: Document[] } = await res.json()
    return data.documents;
  }

  offset(offset: number): ListBuilder {
    this.options.offset = offset;
    return this;
  }

  limit(limit: number): ListBuilder {
    this.options.limit = limit;
    return this;
  }

  then<TResult1 = Document[], TResult2 = never>(
    onfulfilled?: ((value: Document[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.list().then(onfulfilled, onrejected);
  }
}

/**
 * Embedbase Client.
 *
 * An typescript library to interact with Embedbase
 */
export default class EmbedbaseClient {
  public embedbaseApiUrl: string
  protected embedbaseApiKey: string

  public headers: {
    [key: string]: string
  }

  /**
   * Create a new client for use in the browser.
   * @param embedbaseUrl The unique Embedbase URL which is supplied when you create a new project in your project dashboard.
   * @param embedbaseKey The unique Embedbase Key which is supplied when you create a new project in your project dashboard.
   */
  constructor(
    protected embedbaseUrl: string,
    protected embedbaseKey?: string,
  ) {
    if (!embedbaseUrl) throw new Error('embedbaseUrl is required.')
    // if url is embedbase cloud (https://api.embedbase.xyz) and no key is provided, throw error
    if (embedbaseUrl === 'https://api.embedbase.xyz' && !embedbaseKey) {
      throw new Error('embedbaseKey is required when using Embedbase Cloud.')
    }

    // strip trailing slash
    const _embedbaseUrl = embedbaseUrl.replace(/\/$/, '')
    this.embedbaseApiUrl = `${_embedbaseUrl}/v1`
    this.embedbaseApiKey = embedbaseKey
    this.headers = {
      'Content-Type': 'application/json',
    }
    if (this.embedbaseApiKey) {
      this.headers['Authorization'] = `Bearer ${this.embedbaseApiKey}`
    }
  }

  async createContext(
    dataset: string,
    query: string,
    options: { limit?: number } = {}
  ): Promise<ClientContextData> {
    const top_k = options.limit || 5
    const searchUrl = `${this.embedbaseApiUrl}/${dataset}/search`
    const res: Response = await fetch(searchUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, top_k }),
    })
    const data: SearchData = await res.json()
    return data.similarities.map((similarity) => similarity.data)
  }

  /**
   * Embedbase Search allows you to search for most similar documents in your Embedbase database.
   */
  search(
    dataset: string,
    query: string,
    options: SearchOptions = {}
  ): SearchBuilder {
    return new SearchBuilder(this, dataset, query, options);
  }

  async add(dataset: string, document: string, metadata?: Metadata): Promise<Document> {
    const addUrl = `${this.embedbaseApiUrl}/${dataset}`
    const res: Response = await fetch(addUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ documents: [{ data: document, metadata: metadata }] }),
    })
    const data: { results: Document[] } = await res.json()
    return data.results[0]
  }

  async batchAdd(dataset: string, documents: BatchAddDocument[]): Promise<Document[]> {
    const addUrl = `${this.embedbaseApiUrl}/${dataset}`
    const res: Response = await fetch(addUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ documents: documents }),
    })
    const data: { results: Document[] } = await res.json()
    return data.results
  }

  list(dataset: string, options: RangeOptions = {
    offset: 0,
    limit: 100,
  }): ListBuilder {
    return new ListBuilder(this, dataset, options);
  }

  public async clear(dataset: string): Promise<void> {
    const clearUrl = `${this.embedbaseApiUrl}/${dataset}/clear`
    await fetch(clearUrl, {
      method: 'GET',
      headers: this.headers,
    })
  }

  public async update(dataset: string, documents: UpdateDocument[]): Promise<Document[]> {
    const updateUrl = `${this.embedbaseApiUrl}/${dataset}`
    const res: Response = await fetch(updateUrl, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({ documents: documents }),
    })
    const data: { results: Document[] } = await res.json()
    return data.results
  }

  dataset(dataset: string): {
    search: (query: string, options?: SearchOptions) => SearchBuilder
    add: (document: string, metadata?: Metadata) => Promise<Document>
    batchAdd: (documents: BatchAddDocument[]) => Promise<Document[]>
    createContext: (query: string, options?: SearchOptions) => Promise<ClientContextData>
    list: (options?: RangeOptions) => ListBuilder
    clear: () => Promise<void>
    update: (documents: UpdateDocument[]) => Promise<Document[]>
  } {
    return {
      search: (query: string, options?: SearchOptions) =>
        this.search(dataset, query, options),
      add: async (document: string, metadata?: Metadata) => this.add(dataset, document, metadata),
      batchAdd: async (documents: BatchAddDocument[]) => this.batchAdd(dataset, documents),
      createContext: async (query: string, options?: SearchOptions) =>
        this.createContext(dataset, query, options),
      list: (options?: RangeOptions) => this.list(dataset, options),
      clear: async () => this.clear(dataset),
      update: async (documents: UpdateDocument[]) => this.update(dataset, documents),

    }
  }

  async datasets(): Promise<ClientDatasets[]> {
    const datasetsUrl = `${this.embedbaseApiUrl}/datasets`
    const res: Response = await fetch(datasetsUrl, {
      method: 'GET',
      headers: this.headers,
    })
    const data: ClientDatasets[] = camelize((await res.json()).datasets)
    return data
  }

  public generate(prompt: string, options?: GenerateOptions): CustomAsyncGenerator<string> {
    const url = 'https://app.embedbase.xyz/api/chat'
    // const url = 'http://localhost:3000/api/chat'

    options = options || {
      history: [],
    }

    // hack to remove system from history because api is slightly different from openai
    // and we want to go on-pair with openai api for now
    let system = ''
    if (options?.history) {
      const systemIndex = options.history.findIndex((item) => item.role === 'system')
      if (systemIndex > -1) {
        system = options.history[systemIndex].content
        options.history.splice(systemIndex, 1)
      }
    }

    const asyncGen = async function* (): AsyncGenerator<string> {
      const streamGen = stream(
        url,
        JSON.stringify({
          prompt,
          system,
          history: options?.history,
        }),
        this.headers,
      );

      for await (const res of streamGen) {
        yield res;
      }
    }.bind(this);

    return new CustomAsyncGenerator<string>(asyncGen());
  }
}

