import { HfInference } from '@huggingface/inference'
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser'
import { Role } from '../pages/api/chat'

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export interface OpenAIPayload {
  model: string
  messages: { role: Role; content: string }[]
  stream: boolean
}
export const createCompletion = async (payload: OpenAIPayload) => {
  payload.stream = false
  const data = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
    },
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.json())
}

export async function OpenAIStream(payload: OpenAIPayload) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  // createCompletion(payload)

  let counter = 0
  let res: Response

  try {
    console.log('trying to fetch')
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
      },
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.log(e)
  }
  const stream = new ReadableStream({
    async start(controller) {
      // callback
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === 'event') {
          const data = event.data
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === '[DONE]') {
            controller.close()
            return
          }
          try {
            const json = JSON.parse(data)
            const text = json.choices[0]?.delta?.content
            if (!text) return
            if (counter < 2 && (text.match(/\n/) || []).length) {
              // this is a prefix character (i.e., "\n\n"), do nothing
              return
            }
            const queue = encoder.encode(text)
            controller.enqueue(queue)
            counter++
          } catch (e) {
            // maybe parse error
            controller.error(e)
          }
        }
      }

      // stream response (SSE) from OpenAI may be fragmented into multiple chunks
      // this ensures we properly read chunks and invoke an event for each SSE event stream
      const parser = createParser(onParse)
      // https://web.dev/streams/#asynchronous-iteration
      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk))
      }
    },
  })

  return stream
}


export interface HuggingFacePayload {
  inputs: string;
  parameters?: {
    best_of?: number;
    top_k?: number;
    top_p?: number;
    temperature?: number;
    max_new_tokens?: number;
    watermark?: boolean;
    return_full_text?: boolean;
    stop?: string[];
  };
  stream: boolean;
}

export interface HuggingFaceResponse {
  generated_text: string;
  ended: boolean;
}

const generateText = async (modelUrl: string, payload: HuggingFacePayload): Promise<HuggingFaceResponse> => {
  payload.stream = false;
  const response = await fetch(modelUrl, {
    headers: {
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY ?? ''}`,
    },
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const text = await response.text()
    console.log(text)
    throw new Error(text)
  }
  const responseJson = await response.json()
  console.log('responseJson', responseJson)
  return responseJson[0]?.generated_text || responseJson.generated_text
}

// TODO: cleanup this dirty code :D

const huggingFaceStream = async (modelUrl: string, payload: HuggingFacePayload): Promise<ReadableStream> => {
  const inference = new HfInference();
  const model = inference.endpoint(modelUrl);
  const stream = model.textGenerationStream(payload);

  // return a readablestream
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        console.log('chunk', chunk);
        if (!chunk.generated_text) continue
        const queue = encoder.encode(chunk.generated_text);
        controller.enqueue(queue);
      }
      controller.close();
    },
  });

  // const encoder = new TextEncoder();

  // payload.stream = true;
  // const response = await fetch(modelUrl, {
  //   headers: {
  //     'Content-Type': 'application/json',
  //     // Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY ?? ''}`,
  //     Accept: 'text/event-stream'
  //   },
  //   method: 'POST',
  //   body: JSON.stringify(payload),
  // });

  // return new ReadableStream({
  //   async start(controller) {
  //     const decoder = new TextDecoder();
  //     const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
  //       console.log('event', event);

  //       if (event.type === 'event') {
  //         let data = JSON.parse(event.data)
  //         data = data?.token?.text
  //         if (data?.token?.special) return null;
  //         if (data === null) return null;
  //         console.log('data', data);
  //         const queue = encoder.encode(data)
  //         controller.enqueue(queue);
  //         return data;
  //       }
  //       return null;
  //     });

  //     for await (const buffer of response.body as any) {
  //       const text = decoder.decode(buffer);
  //       console.log('text', text);
  //       parser.feed(text);
  //     }
  //   },
  // });
}

export { generateText, huggingFaceStream }

