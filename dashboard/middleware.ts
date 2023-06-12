import { NextResponse } from 'next/server'

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { NextRequest } from 'next/server'
import { apiMiddleware } from './lib/apiMiddleware'
import { hasSessionMiddleware } from './utils/hasSessionMiddleware'

export async function middleware(req: NextRequest) {
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
  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getSession()
  return res
}
