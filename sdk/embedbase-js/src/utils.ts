import http, { ClientRequest, IncomingMessage } from "http";
import https from "https";
import { getEnv } from "./env";
import { Fetch } from "./types";

export const stringifyList = (list: any[]) => {
  return list.map((item) => JSON.stringify(item))
}

/**
 * Camelize object recursively
 * @param obj
 * @returns
 */
export const camelize = <T>(obj: any): T => {
  if (typeof obj !== 'object' || obj === null) {
    return obj as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => camelize(item)) as unknown as T
  }
  const camelized = {}
  for (const key in obj) {
    camelized[camelCase(key)] = camelize(obj[key])
  }
  return camelized as T
}

const camelCase = (str: string) => {
  return str.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '')
  })
}





type Headers = {
  [key: string]: string;
};

function getRequestModule(url: string) {
  return url.startsWith("https") ? https : http;
}

async function* streamHttp(
  url: string,
  body: string,
  headers: Headers
): AsyncGenerator<string, void, undefined> {
  const requestModule = getRequestModule(url);

  async function* readStream(
    stream: IncomingMessage
  ): AsyncGenerator<string, void, undefined> {
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      yield decoder.decode(chunk);
    }
  }

  const response: IncomingMessage = await new Promise(
    (resolve: (response: IncomingMessage) => void, reject: (error: Error) => void) => {
      const requestOptions = {
        method: "POST",
        headers: headers,
      };

      const request: ClientRequest = requestModule.request(url, requestOptions, resolve);

      request.on("error", reject);

      request.write(body);
      request.end();
    }
  );

  if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
    // assuming the error is a JSON object
    let rawData = "";
    for await (const chunk of readStream(response)) {
      rawData += chunk;
    }
    const message = JSON.parse(rawData);
    throw new Error(message.error || message);
  } else {
    yield* readStream(response);
  }
}

async function* streamFetch(
  url: string,
  body: string,
  headers: Headers
): AsyncGenerator<string, void, undefined> {
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: body,
  })

  if (!response.ok) {
    // assuming the error is a JSON object
    const message = await response.json()
    // TODO: test this
    throw new Error(message.error || message)
  }

  // This data is a ReadableStream
  const data = response.body
  if (!data) {
    return
  }

  const reader = data.getReader()
  const decoder = new TextDecoder()
  let done = false

  while (!done) {
    const { value, done: doneReading } = await reader.read()
    done = doneReading
    const chunkValue = decoder.decode(value)
    yield chunkValue
  }
}

/**
 * Stream data from a URL
 * @param url 
 * @param body 
 * @param headers 
 * @returns 
 */
export async function* stream(url: string, body: string, headers: { [key: string]: string }) {
  if (getEnv() === "node") {
    yield* streamHttp(url, body, headers)
  } else {
    yield* streamFetch(url, body, headers)
  }
}

export const getFetch = (): Fetch => {
  if (getEnv() === "node") {
    return require("cross-fetch").default
  }
  return fetch
}


export class CustomAsyncGenerator<T> implements AsyncIterableIterator<T> {
  private generator: AsyncGenerator<T>;
  constructor(asyncGenerator: AsyncGenerator<T>) {
    this.generator = asyncGenerator;
  }

  // Standard methods for AsyncIterableIterator
  async next(): Promise<IteratorResult<T>> {
    return await this.generator.next();
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }

  async return?(value?: T): Promise<IteratorResult<T, any>> {
    return await this.generator.return(value);
  }

  async throw?(e?: any): Promise<IteratorResult<T>> {
    return await this.generator.throw(e);
  }

  /**
   * **Example**
   * ```ts
   * await generator.map((value) => value + 1)
   * ```
   * @param fn 
   * @returns 
   */
  async map<U>(fn: (value: T) => U): Promise<Array<U>> {
    const result: Array<U> = [];
    let iterator = await this.generator.next();
    while (!iterator.done) {
      result.push(fn(iterator.value));
      iterator = await this.generator.next();
    }
    return result;
  }

  /**
   * **Example**
   * ```ts
   * await generator.filter((value) => value > 10)
   * ```
   * @param fn 
   * @returns 
   */
  async filter(fn: (value: T) => boolean): Promise<Array<T>> {
    const result: Array<T> = [];
    let iterator = await this.generator.next();
    while (!iterator.done) {
      if (fn(iterator.value)) {
        result.push(iterator.value);
      }
      iterator = await this.generator.next();
    }
    return result;
  }

  /**
   * **Example**
   * ```ts
   * await generator.forEach((value) => console.log(value))
   * ```
   * @param fn 
   * @returns 
   */
  async forEach(fn: (value: T) => void): Promise<void> {
    let iterator = await this.generator.next();
    while (!iterator.done) {
      fn(iterator.value);
      iterator = await this.generator.next();
    }
  }

  /**
   * **Example**
   * ```ts
   * await generator.batch(100).map((b) => console.log('do something with batch of 100 here'))
   * ```
   * 
   * Returns a CustomAsyncGenerator of batches of size `batchSize`
   * @param batchSize 
   * @param fn 
   */
  batch(batchSize: number): CustomAsyncGenerator<Array<T>> {
    return new CustomAsyncGenerator(this.batchGenerator(batchSize));
  }

  private async *batchGenerator(batchSize: number): AsyncGenerator<Array<T>> {
    let batch: Array<T> = [];
    let iterator = await this.generator.next();
    while (!iterator.done) {
      batch.push(iterator.value);
      if (batch.length === batchSize) {
        yield batch;
        batch = [];
      }
      iterator = await this.generator.next();
    }

    // If there are any leftover items in the batch, yield them as well.
    if (batch.length > 0) {
      yield batch;
    }
  }
} 

