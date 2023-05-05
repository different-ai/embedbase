import {
  createMiddlewareSupabaseClient,
  createServerSupabaseClient,
} from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

// subscription_status:
// | 'trialing'
// | 'active'
// | 'canceled'
// | 'incomplete'
// | 'incomplete_expired'
// | 'past_due'
// | 'unpaid'
// | 'paused';
// NEXT_PUBLIC_SUPABASE_URL=https://teyceztmbotvelgagqwm.supabase.co
// grab project id from it
export const PROJECT_ID = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
  'https://',
  ''
)?.replace('.supabase.co', '')

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  // check if there is an api key in the headers
  const apiKey = req.headers.get('Authorization')

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
          body: JSON.stringify({ apiKey: token }),
        }
      )
      // if we have a user id then we can continue
      if (!response.ok) {
        return response
      }
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

  const supabase = createMiddlewareSupabaseClient({ req, res })

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
  console.log(response.statusText)

  // if we have a user id then we can continue
  if (!response.ok) {
    return response
  }

  return res
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/api/chat/',
}
