import { createMiddlewareSupabaseClient, createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'
import { tiers } from './components/PricingSection'

// subscription_status:
// | 'trialing'
// | 'active'
// | 'canceled'
// | 'incomplete'
// | 'incomplete_expired'
// | 'past_due'
// | 'unpaid'
// | 'paused';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  // check if there is an api key in the headers
  const apiKey = req.headers.get('Authorization')
  let userId: string | null = null

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
    // call https://$SUPABASE_PROJECT_ID.functions.supabase.co/apiKey
    try {
      const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      const response = await fetch(`https://${projectId}.functions.supabase.co/apiKey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: token }),
      }).then((res) => res.json())
      // if we have a user id then we can continue
      if (!response.userId) {
        return new Response(JSON.stringify({ error: 'Invalid Api Key' }), {
          status: 401,
        })
      }
      userId = response.userId
    } catch (error) {
      console.log(error)
      return new Response(JSON.stringify({ error: 'Invalid Api Key' }), {
        status: 401,
      })
    }
  }

  const supabase = createMiddlewareSupabaseClient({ req, res })

  // dashboard auth using the session
  if (!userId) {
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
    userId = session.user.id
  }

  // get stripe subscription from supabase
  const { data: stripeSubscription, error: errorSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('price_id', tiers[1].id)
    .in('status', ['trialing', 'active'])
    .single()

  if (!stripeSubscription || errorSubscription) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized User No Subscription' }),
      {
        status: 401,
      }
    )
  }

  return res
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/api/chat/',
}
