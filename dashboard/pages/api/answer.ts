import { getApiKey } from '@/lib/getApiKey'
import { OpenAIStream, OpenAIPayload } from '@/lib/utils'
import { defaultChatSystem } from '@/utils/constants'
import * as Sentry from '@sentry/nextjs'
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { PROJECT_ID } from '../../middleware'

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
  publicApiKey: string
}

export type Role = 'user' | 'system' | 'assistant'
type Chat = {
  role: Role
  content: string
}

const handler = async (req: Request, res: Response): Promise<Response> => {
  const getEmbedbaseApp = async (publicApiKey: string) => {
    const supabase = createMiddlewareSupabaseClient(
      // @ts-ignore
      { req, res },
      {
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      }
    )

    const { data } = await supabase
      .from('apps')
      .select('owner, name, datasets, system_message')
      .eq('public_api_key', publicApiKey)
      .single()

    console.log(data)
    return data
  }

  const { prompt, history, system, publicApiKey } =
    (await req.json()) as RequestPayload

  if (!publicApiKey) {
    return new Response(JSON.stringify({ error: 'No apiKey' }), {
      status: 401,
    })
  }
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'No prompt in the request' }), {
      status: 400,
    })
  }
  const appData = await getEmbedbaseApp(publicApiKey)
  const userId = appData.owner

  const response = await fetch(
    `https://${PROJECT_ID}.functions.supabase.co/consumeApi`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: userId }),
    }
  )
  // retrieve api key from public api key

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
    return new Response(stream)
  } catch (error) {
    Sentry.captureException(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    })
  }
}
export default handler
