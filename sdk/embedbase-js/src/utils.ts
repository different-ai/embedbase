import http, { IncomingMessage, ClientRequest } from "http";
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
    throw new Error(message);
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
    const message = await response.text()
    throw new Error(message)
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
export async function* stream (url: string, body: string, headers: { [key: string]: string }) {
  if (getEnv() === "node") {
    yield* streamHttp(url, body, headers)
  } else {
    yield* streamFetch(url, body, headers)
  }
}

export const getFetch = (): Fetch => {
  if (getEnv() === "node") {
    // return import('cross-fetch').then((f) => f.default)
    return require("cross-fetch").default
  }
  return fetch
}
