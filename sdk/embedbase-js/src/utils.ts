import http, { IncomingMessage, ClientRequest } from "http";
import https from "https";

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



/**
 * Stream data from a URL
 * @param url 
 * @param body 
 * @param headers 
 * @returns 
 */

type Headers = {
  [key: string]: string;
};

function getRequestModule(url: string) {
  return url.startsWith("https") ? https : http;
}

export async function* stream(
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
