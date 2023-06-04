import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { getRedirectURL } from '@/lib/redirectUrl'
import { cookies } from 'next/headers'

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

  console.log('before supabase')
  const supabase = createServerActionClient(
    { cookies },
    // @ts-ignore
    {
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }
  )
  console.log('after supabase')

  console.log('before session')
  const {
    data: { session },
    error: errorSession,
  } = await supabase.auth.getSession()

  console.log('after session')
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

  console.log('before select apps')
  const { data, error } = await supabase
    .from('apps')
    .insert({
      owner: userId,
      name: name,
      datasets: datasets,
      system_message: systemMessage,
    })
    .select('public_api_key')
    .single()

  console.log('after select apps')

  console.log('reaching data', data)
  if (!data) {
    return new Response(JSON.stringify({ error: 'No data returned' }), {
      status: 500,
    })
  }

  console.log('reaching errors', error)
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    })
  }

  const baseUrl = getRedirectURL()
  return new Response(
    JSON.stringify({ link: `${baseUrl}chat?appId=${data?.public_api_key}` }),
    {
      status: 200,
    }
  )
}
export default handler
