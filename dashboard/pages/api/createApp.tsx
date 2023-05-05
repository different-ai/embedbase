import { OpenAIPayload, OpenAIStream } from '@/lib/utils'
import { defaultChatSystem } from '@/utils/constants'
import * as Sentry from '@sentry/nextjs'
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { PROJECT_ID } from '../../middleware'
import { v4 } from 'uuid'
import { getRedirectURL } from '@/lib/redirectUrl'
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

export const config = {
  runtime: 'edge',
}

interface RequestPayload {
  name: string
  datasets: string[]
  systemMessage: string
}

const handler = async (req: Request, res: Response): Promise<Response> => {
  const { name, datasets, systemMessage } = (await req.json()) as RequestPayload

  console.log('name', name)
  console.log('datasets', datasets)
  console.log('systemMessage', systemMessage)

  if (!name) {
    return new Response(JSON.stringify({ error: 'No name provided' }), {
      status: 401,
    })
  }

  if (!datasets) {
    return new Response(JSON.stringify({ error: 'No datasets provided' }), {
      status: 401,
    })
  }

  if (!systemMessage) {
    return new Response(
      JSON.stringify({ error: 'No system message provided' }),
      {
        status: 401,
      }
    )
  }

  const supabase = createMiddlewareSupabaseClient(
    // @ts-ignore
    { req, res },
    {
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }
  )

  const {
    data: { session },
    error: errorSession,
  } = await supabase.auth.getSession()

  // Check if we have a session
  if (!session || errorSession) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized User No Session' }),
      {
        status: 401,
      }
    )
  }
  const userId = session.user.id

  // generate a uuid
  const uuid = v4()

  const { data, error } = await supabase
    .from('apps')
    .insert({
      owner: userId,
      name: name,
      datasets: datasets,
      system_message: systemMessage,
      public_api_key: uuid,
    })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    })
  }

  const baseUrl = getRedirectURL()
  return new Response(
    JSON.stringify({ link: `${baseUrl}chat?appId=${uuid}` }),
    {
      status: 200,
    }
  )
}
export default handler
