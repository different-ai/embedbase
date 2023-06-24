import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export const PROJECT_ID = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
  'https://',
  ''
)?.replace('.supabase.co', '')

const track = async (req, res, userId) => {
  await fetch(
    'https://app.posthog.com/capture/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: 'phc_plfzAimxHysKLaS80RK3NPaL0OJhlg983m3o5Zuukp',
        event: req.nextUrl.pathname === '/api/search' ?
          'search' :
          req.nextUrl.pathname === '/api/chat' ?
            'chat middleware submitted' :
            req.nextUrl.pathname === '/api/add' ?
              'add' :
              'unknown',
        distinct_id: userId,
      }),
    }
  )
}

// this is a hack we should move away from this middleware
export const apiMiddleware = async ({ req, res }) => {
  // check if there is an api key in the headers
  const apiKey = req.headers.get('Authorization')

  const endpoint = req.nextUrl.pathname === '/api/chat' ?
    'chat' :
    req.nextUrl.pathname === '/api/search' ?
      'search' :
      'unknown'

  // api key auth
  if (apiKey) {
    // get the bearer token
    const split = apiKey.split(' ')
    if (split.length !== 2) {
      return new Response(JSON.stringify({ error: 'Invalid Api Key' }), {
        status: 401,
      })
    }

    const token = split[1]
    // call https://$SUPABASE_PROJECT_ID.functions.supabase.co/consumeApi
    try {
      const response = await fetch(
        `https://${PROJECT_ID}.functions.supabase.co/consumeApi`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apiKey: token, endpoint: endpoint }),
        }
      )
      // if we have a user id then we can continue
      if (!response.ok) {
        return response
      }
      const { userId } = await response.json()
      await track(req, res, userId)
      return res
    } catch (error) {
      console.log(error)
      return new Response(JSON.stringify({ error: 'Invalid Api Key' }), {
        status: 401,
      })
    }
  }

  // no api key means that we are in the dashboard directly authenticated
  // with supabase client and can get the user session

  const supabase = createMiddlewareClient({ req, res })

  // dashboard auth using the session
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
  req.headers.set('userId', userId)

  const response = await fetch(
    `https://${PROJECT_ID}.functions.supabase.co/consumeApi`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: userId, endpoint: endpoint }),
    }
  )

  // if we have a user id then we can continue
  if (!response.ok) {
    return response
  }
  await track(req, res, userId)
}