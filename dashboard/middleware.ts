import { NextResponse } from 'next/server'

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { NextRequest } from 'next/server'
import { apiMiddleware } from './lib/apiMiddleware'
import { hasSessionMiddleware } from './utils/hasSessionMiddleware'
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

export async function middleware(req: NextRequest) {
  console.log('middleware', req.nextUrl.pathname)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: CORS_HEADERS,
    })
  }
  const res = NextResponse.next()
  if (
    req.nextUrl.pathname === '/api/chat' ||
    req.nextUrl.pathname === '/api/search'
  ) {
    return await apiMiddleware({ req, res })
  }
  if (req.nextUrl.pathname.includes('dashboard')) {
    return await hasSessionMiddleware({ req, res })
  }

  // this middleware refreshes the user's session and must be run
  // for any Server Component route that uses `createServerComponentSupabaseClient`
  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getSession()
  return res
}
