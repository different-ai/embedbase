
import { defaultChatSystem } from '../../utils/constants'
import * as Sentry from '@sentry/nextjs'
import cors from '@/utils/cors'
import { OpenAIStream, OpenAIPayload } from '@/lib/utils'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

export const config = {
  runtime: 'edge',
}

interface RequestPayload {
  prompt: string
  history: Chat[]
  system?: string
}

export type Role = 'user' | 'system' | 'assistant'
type Chat = {
  role: Role
  content: string
}
const handler = async (req: Request, res: Response): Promise<Response> => {
  const { prompt, history, system } = (await req.json()) as RequestPayload
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
    ...history,
    { role: 'user', content: prompt },
  ]

  //3. pass in the history of the conversation as well as the context (which is included in the prompt)
  const payload: OpenAIPayload = {
    model: 'gpt-3.5-turbo',
    messages,
    stream: true,
  }

  try {
    const stream = await OpenAIStream(payload)
    return cors(req, new Response(stream))
  } catch (error) {
    Sentry.captureException(error)
    return cors(
      req,
      new Response(JSON.stringify({ error: error.message }), { status: 500 })
    )
  }
}
export default handler
