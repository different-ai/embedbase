import { splitText } from './split';
import type {
  BatchAddDocument,
  ClientContextData,
  ClientDatasets,
  ClientSearchData,
  ClientSearchResponse,
  Document,
  GenerateOptions,
  Metadata,
  RangeOptions,
  SearchData,
  SearchOptions,
  SearchResponse,
  UpdateDocument
} from './types';
import { CustomAsyncGenerator, batch, camelize, getFetch, stream } from './utils';

let fetch = getFetch();

/**
 * SearchBuilder class provides a convenient way to build search queries.
 *
 * @class SearchBuilder
 *
 * @example 
 * const results = await embedbase.search('dataset_name', 'search_query').where('field_name', 'operator', 'value').limit(5)
 */
class SearchBuilder implements PromiseLike<ClientSearchData> {
  constructor(
    private client: EmbedbaseClient,
    private dataset: string,
    private query: string,
    private options: SearchOptions = {}
  ) { }

  /**
   * Searches for most similar documents in the dataset using the search query and options provided during instantiation.
   *
   * @returns {Promise<ClientSearchData>} Resolves to an array of similarities.
   * 
   * @example
   * const searchResults = await embedbase.search('dataset_name', 'search_query').search()
   */
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
    await this.client.handleError(res);
    const data: SearchData = await res.json()

    return data.similarities;
  }

  /**
   * Sets a specific search condition (where clause) for a field.
   *
   * @param {string} field - The field that the where clause will condition to.
   * @param {string} operator - The operator of the where clause.
   * @param {any} value - The value that the field will be compared to using the specific operator.
   * @returns {SearchBuilder} - Returns itself for chaining other methods.
   * 
   * @example
   * const searchResults = await embedbase.search('dataset_name', 'search_query').where('field_name', 'operator', 'value')
   */
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

/**
 * ListBuilder class provides a convenient way to list documents in a dataset.
 *
 * @class ListBuilder
 *
 * @example 
 * const documents = await embedbase.list('dataset_name').offset(5).limit(5)
 */
class ListBuilder implements PromiseLike<Document[]> {
  constructor(
    private client: EmbedbaseClient,
    private dataset: string,
    private options: RangeOptions = {
      offset: 0,
      limit: 10
    }
  ) { }

  /**
   * Lists documents in the dataset using the options provided during instantiation.
   *
   * @returns {Promise<Document[]>} Resolves to an array of documents.
   * 
   * @example
   * const documents = await embedbase.list('dataset_name').list()
   */
  async list(): Promise<Document[]> {
    const listUrl = `${this.client.embedbaseApiUrl}/${this.dataset}?offset=${this.options.offset}&limit=${this.options.limit}`
    const res: Response = await fetch(listUrl, {
      method: 'GET',
      headers: this.client.headers,
    })
    await this.client.handleError(res);
    const data: { documents: Document[] } = await res.json()
    return data.documents;
  }

  /**
   * Sets the offset for the list of documents.
   *
   * @param {number} offset - The offset for the list of documents.
   * @returns {ListBuilder} - Returns itself for chaining other methods.
   * 
   * @example
   * const documents = await embedbase.list('dataset_name').offset(5)
   */
  offset(offset: number): ListBuilder {
    this.options.offset = offset;
    return this;
  }

  /**
   * Sets the limit for the list of documents.
   *
   * @param {number} limit - The limit for the list of documents.
   * @returns {ListBuilder} - Returns itself for chaining other methods.
   * 
   * @example
   * const documents = await embedbase.list('dataset_name').limit(5)
   */
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

  async handleError(res: Response): Promise<void> {
    if (!res.ok) {
      let errorMessage = 'An error occurred, please try to ask the error message ' +
        'in https://docs.embedbase.xyz/ GPT, or head to Discord'

      try {
        // Try to parse the response and get the error message
        const errorData = await res.json();
        if (errorData?.detail) {
          // turn '[{"loc":["body","documents",0,"data"],"msg":"field required","type":"value_error.missing"}]'
          // into something readable as a string
          errorMessage = errorData.detail.map((error: any) => {
            const field = error.loc.join('.')
            return `${field}: ${error.msg}`
          }).join(', ')
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch (error) {
        // If parsing the response fails, use a generic error message.
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Creates a context based on the search query and options provided.
   *
   * @param {string} query - The search query.
   * @param {SearchOptions} options - Optional search options.
   * @returns {Promise<ClientContextData>} - Resolves to a ClientContextData object.
   * 
   * @example
   * const contextData = await embedbase.createContext('dataset_name', 'search_query');
   */
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
    await this.handleError(res);
    const data: SearchData = await res.json()
    return data.similarities.map((similarity) => similarity.data)
  }

  /**
   * Searches for most similar documents in a dataset using the search query and options provided.
   *
   * @param {string} query - The search query.
   * @param {SearchOptions} options - Optional search options.
   * @returns {SearchBuilder} - Returns a SearchBuilder instance to build search queries.
   * 
   * @example
   * const searchBuilder = embedbase.search('dataset_name', 'search_query');
   */
  search(
    dataset: string,
    query: string,
    options: SearchOptions = {}
  ): SearchBuilder {
    return new SearchBuilder(this, dataset, query, options);
  }

  /**
   * Adds a document to the dataset with optional metadata.
   * 
   * @param {string} document - The document content.
   * @param {Metadata} metadata - Optional metadata for the document.
   * @returns {Promise<Document>} - Resolves to the added document.
   * 
   * @example
   * const addedDocument = await embedbase.add('dataset_name', 'document_content', { key: 'value' });
   */
  async add(dataset: string, document: string, metadata?: Metadata): Promise<Document> {
    // const addUrl = `https://app.embedbase.xyz/api/add`
    const addUrl = `http://localhost:3000/api/add`
    const res: Response = await fetch(addUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ dataset_id: dataset, documents: [{ data: document, metadata: metadata }] }),
    })
    await this.handleError(res);
    const data: { results: Document[] } = await res.json()
    return data.results[0]
  }

  /**
   * Adds multiple documents to the dataset as a batch.
   * 
   * @param {BatchAddDocument[]} documents - An array of BatchAddDocument objects containing the document content and optional metadata.
   * @returns {Promise<Document[]>} - Resolves to an array of added documents.
   * 
   * @example
   * const batchDocuments = [{ data: 'document1', metadata: { key: 'value1'} }, { data: 'document2', metadata: { key: 'value2'} }];
   * const addedDocuments = await embedbase.batchAdd('dataset_name', batchDocuments);
   */
  async batchAdd(dataset: string, documents: BatchAddDocument[]): Promise<Document[]> {
    const addUrl = `https://app.embedbase.xyz/api/add`

    const res: Response = await fetch(addUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ dataset_id: dataset, documents: documents }),
    })
    await this.handleError(res);
    const data: { results: Document[] } = await res.json()
    return data.results
  }

  /**
   * 
   * @param {string} dataset 
   * @param {RangeOptions} options 
   * @returns {ListBuilder}
   * 
   * @example
   * await embedbase.list('dataset_name')
   */
  list(dataset: string, options: RangeOptions = {
    offset: 0,
    limit: 100,
  }): ListBuilder {
    return new ListBuilder(this, dataset, options);
  }

  /**
   * Clears all the documents in a dataset.
   *
   * @param {string} dataset - The name of the dataset to clear.
   * @returns {Promise<void>}
   *
   * @example
   * await embedbase.clear('dataset_name')
   */
  public async clear(dataset: string): Promise<void> {
    const clearUrl = `${this.embedbaseApiUrl}/${dataset}/clear`
    await fetch(clearUrl, {
      method: 'GET',
      headers: this.headers,
    })
  }

  /**
   * Updates the documents in a dataset.
   *
   * @param {string} dataset - The name of the dataset to update.
   * @param {UpdateDocument[]} documents - An array of documents to update.
   * @returns {Promise<Document[]>}
   *
   * @example
   * const documentsToUpdate = [{data: 'new_data', metadata: {path: 'notion.so/abcd'}}]
   * const updatedDocuments = await embedbase.update('dataset_name', documentsToUpdate);
   */
  public async update(dataset: string, documents: UpdateDocument[]): Promise<Document[]> {
    const updateUrl = `${this.embedbaseApiUrl}/${dataset}`
    const res: Response = await fetch(updateUrl, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({ documents: documents }),
    })
    await this.handleError(res);
    const data: { results: Document[] } = await res.json()
    return data.results
  }

  /**
   * Returns an object containing methods to interact with a specific dataset.
   *
   * @param {string} dataset - The name of the dataset.
   * @returns {Object} - An object with the following methods:
   *   search: (query: string, options?: SearchOptions) => SearchBuilder
   *   add: (document: string, metadata?: Metadata) => Promise<Document>
   *   batchAdd: (documents: BatchAddDocument[]) => Promise<Document[]>
   *   createContext: (query: string, options?: SearchOptions) => Promise<ClientContextData>
   *   list: (options?: RangeOptions) => ListBuilder
   *
   * @example
   * const dataset = embedbase.dataset('dataset_name');
   * const addedDocument = await dataset.add('new_document');
   * const searchResults = await dataset.search('search_query');
   * const documentsList = await dataset.list();
   */
  dataset(dataset: string): {
    /**
     * Searches for most similar documents in a dataset using the search query and options provided.
     *
     * @param {string} query - The search query.
     * @param {SearchOptions} options - Optional search options.
     * @returns {SearchBuilder} - Returns a SearchBuilder instance to build search queries.
     * 
     * @example
     * const searchBuilder = embedbase.dataset('dataset_name').search('search_query');
     */
    search: (query: string, options?: SearchOptions) => SearchBuilder
    /**
     * Adds a document to the dataset with optional metadata.
     * 
     * @param {string} document - The document content.
     * @param {Metadata} metadata - Optional metadata for the document.
     * @returns {Promise<Document>} - Resolves to the added document.
     * 
     * @example
     * const addedDocument = await embedbase.dataset('dataset_name').add('document_content', { key: 'value' });
     */
    add: (document: string, metadata?: Metadata) => Promise<Document>
    /**
     * Adds multiple documents to the dataset as a batch.
     * 
     * @param {BatchAddDocument[]} documents - An array of BatchAddDocument objects containing the document content and optional metadata.
     * @returns {Promise<Document[]>} - Resolves to an array of added documents.
     * 
     * @example
     * const batchDocuments = [{ data: 'document1', metadata: { key: 'value1'} }, { data: 'document2', metadata: { key: 'value2'} }];
     * const addedDocuments = await embedbase.dataset('dataset_name').batchAdd(batchDocuments);
     */
    batchAdd: (documents: BatchAddDocument[]) => Promise<Document[]>
    /**
     * Creates a context based on the search query and options provided.
     *
     * @param {string} query - The search query.
     * @param {SearchOptions} options - Optional search options.
     * @returns {Promise<ClientContextData>} - Resolves to a ClientContextData object.
     * 
     * @example
     * const contextData = await embedbase.dataset('dataset_name').createContext('search_query');
     */
    createContext: (query: string, options?: SearchOptions) => Promise<ClientContextData>
    /**
     * 
     * @param {string} dataset 
     * @param {RangeOptions} options 
     * @returns {ListBuilder}
     * 
     * @example
     * await embedbase.dataset('dataset_name').list()
     */
    list: (options?: RangeOptions) => ListBuilder
    /**
     * Clears all the documents in a dataset.
     *
     * @param {string} dataset - The name of the dataset to clear.
     * @returns {Promise<void>}
     *
     * @example
     * await embedbase.dataset('dataset_name).clear()
     */
    clear: () => Promise<void>
    /**
     * Updates the documents in a dataset.
     *
     * @param {string} dataset - The name of the dataset to update.
     * @param {UpdateDocument[]} documents - An array of documents to update.
     * @returns {Promise<Document[]>}
     *
     * @example
     * const documentsToUpdate = [{data: 'new_data', metadata: {path: 'notion.so/abcd'}}]
     * const updatedDocuments = await embedbase.dataset('dataset_name').update(documentsToUpdate);
     */
    update: (documents: UpdateDocument[]) => Promise<Document[]>

    /**
     * High level function that chunks and batch add a list of documents to a dataset.
     * In addition this function runs parallel requests when a large amount of documents
     * is added to maximize speed.
     * 
     * @param {string} dataset - The name of the dataset to add the documents to.
     * @param {BatchAddDocument[]} documents - An array of documents to add.
     * @returns {Promise<Document[]>}
     * @example
     * const documents = [
     *    {
     *      data: 'This is a very long document...',
     *      metadata: {
     *       path: 'notion.so/abcd',
     *    },
     *    {
     *      data: 'This is another very long document...',
     *      metadata: {
     *        path: 'notion.so/efgh',
     *      },
     *    },
     *  ]
     * await embedbase.dataset('my-dataset').chunkAndBatchAdd(documents)
     */
    chunkAndBatchAdd: (documents: BatchAddDocument[]) => Promise<Document[]>

    /**
     * Delete all documents at the given filter and add the given documents for this filter
     *
     * @param {BatchAddDocument[]} documents - An array of documents to add.
     * @param {string} filterKey - The metadata key to filter on.
     * @param {string} filterOperator - The operator to use for the filter (only '==' is supported for now).
     * @param {any} filterValue - The value to filter on.
     * @returns {Promise<Document[]>}
     *
     * 
     * @example
      * const documents = [
      *  {
      *    data: 'Nietzsche - Thus Spoke Zarathustra - Man is a rope, tied between beast and overman — a rope over an abyss.',
      *    metadata: {
      *      source: 'notion.so',
      *   },
      *  },
      *  {
      *    data: 'Marcus Aurelius - Meditations - He who lives in harmony with himself lives in harmony with the universe',
      *    metadata: {
      *      source: 'notion.so',
      *    },
      *  }
      * ]
      * await embedbase.dataset(DATASET_NAME).batchAdd(documents)
      *
      * res = await embedbase.dataset(DATASET_NAME).replace([{
      *  data: 'Nietzsche - Thus Spoke Zarathustra - One must have chaos within oneself, to give birth to a dancing star.'
      * }, {
      *  data: 'Marcus Aurelius - Meditations - The happiness of your life depends upon the quality of your thoughts.'
      * }], 'source', '==', 'notion.so')
      * console.log(res)
      * // [
      * //   {
      * //     data: 'Nietzsche - Thus Spoke Zarathustra - One must have chaos within oneself, to give birth to a dancing star.',
      * //     metadata: {
      * //       source: 'notion.so',
      * //     },
      * //   },
      * //   {
      * //     data: 'Marcus Aurelius - Meditations - The happiness of your life depends upon the quality of your thoughts.',
      * //     metadata: {
      * //       source: 'notion.so',
      * //     },
      * //   }
      * // ]
     */
    replace(documents: BatchAddDocument[], filterKey: string, filterOperator: string, filterValue: string): Promise<Document[]>

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
      chunkAndBatchAdd: async (documents: BatchAddDocument[]) => this.chunkAndBatchAdd(dataset, documents),
      replace: async (documents: BatchAddDocument[], filterKey: string, filterOperator: string, filterValue: string) => this.replace(dataset, documents, filterKey, filterOperator, filterValue),
    }
  }

  async datasets(): Promise<ClientDatasets[]> {
    const datasetsUrl = `${this.embedbaseApiUrl}/datasets`
    const res: Response = await fetch(datasetsUrl, {
      method: 'GET',
      headers: this.headers,
    })
    await this.handleError(res);
    const data: ClientDatasets[] = camelize((await res.json()).datasets)
    return data
  }

  public generate(prompt: string, options?: GenerateOptions): CustomAsyncGenerator<string> {
    const url = options?.url || 'https://app.embedbase.xyz/api/chat'

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

  /**
   * Searches the internet for the given query.
   *
   * @param {string} query - The search query.
   * @returns {Promise<ClientSearchResponse[]>}
   * 
   * @example
   * const publicData = await embedbase.internetSearch('anthropic principle')
   * const privateData = await embedbase.dataset('anthropic').search('aliens')
   * const prompt = `Based on this context [build as you prefer the prompt] Answer the question [build as you prefer the prompt]`
   * const answer = await embedbase.generate(prompt).get()
   * console.log(answer.join(''))
   */
  public async internetSearch(query: string): Promise<ClientSearchResponse[]> {
    const url = `${this.embedbaseApiUrl}/search/internet`
    const res: Response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        query: query,
        engine: 'bing'
      }),
      headers: this.headers,
    })
    await this.handleError(res);
    const data: SearchResponse = await res.json()
    const searchResults: ClientSearchResponse[] = data.webPages.value.map((webPage) => ({
      title: webPage.name,
      url: webPage.url,
      snippet: webPage.snippet,
    }))
    return searchResults
  }


  /**
   * Chunks and adds a list of documents to a dataset in parallel requests to maximize speed.
   *
   * @param {string} dataset - The name of the dataset to add the documents to.
   * @param {BatchAddDocument[]} documents - An array of documents to add.
   * @returns {Promise<Document[]>}
   *
   * @example
   * const documents = [
   *   {
   *     data: 'This is a very long document...',
   *     metadata: {
   *       path: 'notion.so/abcd',
   *     },
   *   },
   *   {
   *     data: 'This is another very long document...',
   *     metadata: {
   *       path: 'notion.so/efgh',
   *     },
   *   },
   * ];
   * const addedDocuments = await embedbase.chunkAndBatchAdd('dataset_name', documents);
   */
  public async chunkAndBatchAdd(dataset: string, documents: BatchAddDocument[]): Promise<Document[]> {
    const chunks = []
    await Promise.all(documents.map((document, documentIndex) => splitText(document.data).forEach(({ chunk, start, end }, chunkIndex) =>
      chunks.push({
        data: chunk,
        metadata: {
          ...document.metadata,
          documentIndex: documentIndex,
          chunkIndex: chunkIndex,
          chunkStart: start,
          chunkEnd: end,
        }
      })
    )))
    // run in parallel requests by batches of size 'parallelBatchSize'
    const parallelBatchSize = 100
    const results = await batch(chunks, (batch) => this.batchAdd(dataset, batch), parallelBatchSize)
    return results.flat()
  }


  /**
   * Delete all documents at the given filter and add the given documents for this filter
   *
   * @param {string} dataset - The name of the dataset to add the documents to.
   * @param {BatchAddDocument[]} documents - An array of documents to add.
   * @param {string} filterKey - The metadata key to filter on.
   * @param {string} filterOperator - The operator to use for the filter (only '==' is supported for now).
   * @param {any} filterValue - The value to filter on.
   * @returns {Promise<Document[]>}
   *
   * @example
   * const documents = [
   *  {
   *    data: 'Nietzsche - Thus Spoke Zarathustra - Man is a rope, tied between beast and overman — a rope over an abyss.',
   *    metadata: {
   *      source: 'notion.so',
   *   },
   *  },
   *  {
   *    data: 'Marcus Aurelius - Meditations - He who lives in harmony with himself lives in harmony with the universe',
   *    metadata: {
   *      source: 'notion.so',
   *    },
   *  }
   * ]
   * await embedbase.dataset(DATASET_NAME).batchAdd(documents)
   *
   * res = await embedbase.dataset(DATASET_NAME).replace([{
   *  data: 'Nietzsche - Thus Spoke Zarathustra - One must have chaos within oneself, to give birth to a dancing star.'
   * }, {
   *  data: 'Marcus Aurelius - Meditations - The happiness of your life depends upon the quality of your thoughts.'
   * }], 'source', '==', 'notion.so')
   * console.log(res)
   * // [
   * //   {
   * //     data: 'Nietzsche - Thus Spoke Zarathustra - One must have chaos within oneself, to give birth to a dancing star.',
   * //     metadata: {
   * //       source: 'notion.so',
   * //     },
   * //   },
   * //   {
   * //     data: 'Marcus Aurelius - Meditations - The happiness of your life depends upon the quality of your thoughts.',
   * //     metadata: {
   * //       source: 'notion.so',
   * //     },
   * //   }
   * // ]
   */
  public async replace(dataset: string, documents: BatchAddDocument[], filterKey: string, filterOperator: string, filterValue: string): Promise<Document[]> {

    // only '==' operator is supported now
    if (filterOperator !== '==') {
      throw new Error('Only "==" operator is supported for now')
    }

    // fetch v1/datasetid/replace POST

    const url = `${this.embedbaseApiUrl}/${dataset}/replace`
    const res: Response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        where: {
          [filterKey]: filterValue
        },
        documents: documents,
      }),
      headers: this.headers,
    })

    await this.handleError(res)

    const data: { results: Document[] } = await res.json()
    return data.results
  }

  /**
   * Execute a prompt using Google PaLM2 model
   * @param prompt 
   * @returns 
   */
  public async complete(prompt: string): Promise<string> {
    const url = 'https://llm-usx5gpslaq-uc.a.run.app'

    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        prompt: prompt,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    await this.handleError(res);
    const data: { answer: string } = await res.json()
    return data.answer
  }
}



