import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

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
export const hasSessionMiddleware = async ({ req, res }) => {
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    // Auth condition not met, redirect to home page.
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
}
