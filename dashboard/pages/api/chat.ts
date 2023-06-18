import { OpenAIPayload, OpenAIStream, huggingFaceStream } from '@/lib/utils'
import cors from '@/utils/cors'
import * as Sentry from '@sentry/nextjs'
import { defaultChatSystem } from '../../utils/constants'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

export const config = {
  runtime: 'edge',
}

type Model = 'chatgpt' | 'gpt4' | 'falcon' | 'google' | 'anthropic'

interface RequestPayload {
  prompt: string
  history: Chat[]
  system?: string
  model: Model
}

export type Role = 'user' | 'system' | 'assistant'
type Chat = {
  role: Role
  content: string
}
const handler = async (req: Request, res: Response): Promise<Response> => {
  const { prompt, history, system, model } = (await req.json()) as RequestPayload
  console.log('starting')
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'No prompt in the request' }), {
      status: 400,
    })
  }

  const messages: Chat[] = [
    {
      role: 'system',
      content: system || defaultChatSystem,
    },
    ...history || [],
    { role: 'user', content: prompt },
  ]

  //3. pass in the history of the conversation as well as the context (which is included in the prompt)
  const payload: OpenAIPayload = {
    model: 'gpt-3.5-turbo-16k',
    messages,
    stream: true,
  }

  try {
    let stream: ReadableStream
    if (model === 'falcon') {
      stream = await huggingFaceStream('http://34.127.99.191:9090', {
        inputs: JSON.stringify(messages),
        stream: true,
        parameters: {
          // { model_id: "tiiuae/falcon-7b", revision: None, sharded: None, num_shard: Some(1), quantize: None, trust_remote_code: false, max_concurrent_requests: 128, max_best_of: 2, max_stop_sequences: 4, max_input_length: 1000, max_total_tokens: 1512, max_batch_size: None, waiting_served_ratio: 1.2, max_batch_total_tokens: 32000, max_waiting_tokens: 20, port: 80, shard_uds_path: "/tmp/text-generation-server", master_addr: "localhost", master_port: 29500, huggingface_hub_cache: Some("/data"), weights_cache_override: None, disable_custom_kernels: false, json_output: false, otlp_endpoint: None, cors_allow_origin: [], watermark_gamma: None, watermark_delta: None, env: false }
          max_new_tokens: 1000
        }
      })
    } else {
      stream = await OpenAIStream(payload)
    }
    return cors(
      req,
      new Response(stream, {
        status: 200,
      })
    )
  } catch (error) {
    Sentry.captureException(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    })
  }
}
export default handler
