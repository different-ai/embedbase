import {
  createMiddlewareSupabaseClient,
  createServerSupabaseClient,
} from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'
import { chatMiddleware } from './lib/chatMiddleware'

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


export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  if (req.nextUrl.pathname === '/api/chat') {
    return await chatMiddleware({ req, res })
  }
  return res
}
