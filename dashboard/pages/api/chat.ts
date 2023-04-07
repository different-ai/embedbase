import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { OpenAIStream, OpenAIPayload } from '../../lib/utils'
import { defaultChatSystem } from '../../utils/constants'
import { NextApiRequest, NextApiResponse } from 'next'

export const config = {
  runtime: 'edge',
}

interface RequestPayload {
  prompt: string
  history: string[]
  system?: string
}

type Role = 'user' | 'system'
type Chat = {
  role: Role
  content: string
}
const handler = async (req: Request, res: Response): Promise<Response> => {
  const { prompt, history, system } = (await req.json()) as RequestPayload
  const formattedHistory: Chat[] = history.map((h): Chat => {
    return {
      role: 'user',
      content: h,
    }
  })

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
    ...formattedHistory,
    { role: 'user', content: prompt },
  ]
  console.log({ messages })

  //3. pass in the history of the conversation as well as the context (which is included in the prompt)
  const payload: OpenAIPayload = {
    model: 'gpt-3.5-turbo',
    messages,
    stream: true,
  }

  const stream = await OpenAIStream(payload)

  return new Response(stream)
}

export default handler
