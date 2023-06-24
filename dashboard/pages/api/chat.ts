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
// const track = async (userId: string, model: string) => {
//   await fetch(
//     'https://app.posthog.com/capture/',
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         api_key: 'phc_plfzAimxHysKLaS80RK3NPaL0OJhlg983m3o5Zuukp',
//         event: 'chat api',
//         distinct_id: userId,
//         model: model,
//       }),
//     }
//   )
// }
type LLM = 'openai/gpt-4' | 'openai/gpt-3.5-turbo-16k' | 'tiiuae/falcon-7b' | 'google/bison' | 'bigscience/bloomz-7b1'

interface RequestPayload {
  prompt: string
  history: Chat[]
  system?: string
  model: LLM
  stream: boolean
}

export type Role = 'user' | 'system' | 'assistant'
type Chat = {
  role: Role
  content: string
}

// const getUserId = async (req, res, apiKey) => {
//   // api key auth
//   // get the bearer token
//   const split = apiKey.split(' ')
//   if (split.length !== 2) {
//     return new Response(JSON.stringify({ error: 'Invalid Api Key' }), {
//       status: 401,
//     })
//   }

//   const token = split[1]

//   const supabase = createMiddlewareClient({ req, res }, {
//     supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
//     supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
//   })
//   // const supabase = createPagesServerClient({ req, res })
//   // const supabase = createServerActionClient(
//   //   { cookies },
//   //   // @ts-ignore
//   //   {
//   //     supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
//   //     supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
//   //   }
//   // )
//   const {
//     data: { user_id },
//   } = await supabase
//     .from('api-keys')
//     .select('*')
//     .eq('api_key', token)
//     .limit(1)
//     .single()

//   return user_id

// }

const handler = async (req: Request, res: Response): Promise<Response> => {
  let { prompt, history, system, model, stream } = (await req.json()) as RequestPayload
  if (!model) model = 'openai/gpt-3.5-turbo-16k'
  if (stream === undefined) stream = true
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
  // const apiKey = req.headers.get('Authorization')
  // console.log('api key', apiKey)
  // if (apiKey) {
  //   await getUserId(req, res, apiKey).then((userId) => track(userId, model).catch(console.error))
  // }

  try {
    let readableStream: ReadableStream


    if (model === 'tiiuae/falcon-7b') {
      const url = 'http://34.127.99.191:9090'
      if (!stream) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            stream: false,
            parameters: {
              max_new_tokens: 1000,
              return_full_text: false,
            },
          }),
        }).then((res) => res.json())
        console.log('res', res)
        return new Response(JSON.stringify({
          generated_text: res?.[0]?.generated_text || ''
        }), {
          status: 200,
        })
      }
      readableStream = await huggingFaceStream(url, {
        inputs: prompt,
        stream: true,
        parameters: {
          // { model_id: "tiiuae/falcon-7b", revision: None, sharded: None, num_shard: Some(1), quantize: None, trust_remote_code: false, max_concurrent_requests: 128, max_best_of: 2, max_stop_sequences: 4, max_input_length: 1000, max_total_tokens: 1512, max_batch_size: None, waiting_served_ratio: 1.2, max_batch_total_tokens: 32000, max_waiting_tokens: 20, port: 80, shard_uds_path: "/tmp/text-generation-server", master_addr: "localhost", master_port: 29500, huggingface_hub_cache: Some("/data"), weights_cache_override: None, disable_custom_kernels: false, json_output: false, otlp_endpoint: None, cors_allow_origin: [], watermark_gamma: None, watermark_delta: None, env: false }
          max_new_tokens: 1000,
          return_full_text: false,
        }
      })
    } else if (model === 'bigscience/bloomz-7b1') {
      const url = 'http://34.70.171.197:9090'
      if (!stream) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            stream: false,
            parameters: {
              max_new_tokens: 1000,
              return_full_text: false,
            },
          }),
        }).then((res) => res.json())
        console.log('res', res)
        return new Response(JSON.stringify({
          generated_text: res?.[0]?.generated_text || ''
        }), {
          status: 200,
        })
      }
      // { model_id: "bigscience/bloomz-7b1", revision: None, sharded: None, num_shard: Some(1), quantize: None, trust_remote_code: false, max_concurrent_requests: 128, max_best_of: 2, max_stop_sequences: 4, max_input_length: 1000, max_total_tokens: 1512, max_batch_size: None, waiting_served_ratio: 1.2, max_batch_total_tokens: 32000, max_waiting_tokens: 20, port: 80, shard_uds_path: "/tmp/text-generation-server", master_addr: "localhost", master_port: 29500, huggingface_hub_cache: Some("/data"), weights_cache_override: None, disable_custom_kernels: false, json_output: false, otlp_endpoint: None, cors_allow_origin: [], watermark_gamma: None, watermark_delta: None, env: false 
      readableStream = await huggingFaceStream(url, {
        inputs: prompt,
        stream: true,
        parameters: {
          max_new_tokens: 1000,
          return_full_text: false,
        }
      })
    } else if (model === 'google/bison') {
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

      const data: { answer: string } = await res.json()
      return cors(
        req,
        new Response(JSON.stringify({
          generated_text: data.answer
        }), {
          status: 200,
        })
      )
    } else if (model === 'openai/gpt-4') {
      payload.model = 'gpt-4'
      if (!stream) {
        payload.stream = stream
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
          },
          method: 'POST',
          body: JSON.stringify(payload),
        }).then((res) => res.json())
        return new Response(JSON.stringify({
          generated_text: res?.choices?.[0]?.message.content || ''
        }), {
          status: 200,
        })
      }
      readableStream = await OpenAIStream(payload)
    } else {
      if (!stream) {
        payload.stream = stream
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
          },
          method: 'POST',
          body: JSON.stringify(payload),
        }).then((res) => res.json())
        return new Response(JSON.stringify({
          generated_text: res?.choices?.[0]?.message.content || ''
        }), {
          status: 200,
        })
      }
      readableStream = await OpenAIStream(payload)
    }
    return cors(
      req,
      new Response(readableStream, {
        status: 200,
      })
    )
  } catch (error) {
    console.error(error)
    Sentry.captureException(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    })
  }
}
export default handler
