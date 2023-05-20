import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'
import { chatMiddleware } from './lib/chatMiddleware'
import { hasSessionMiddleware } from './utils/hasSessionMiddleware'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  if (req.nextUrl.pathname === '/api/chat') {
    return await chatMiddleware({ req, res })
  }
  if (req.nextUrl.pathname.includes('dashboard')) {
    return await hasSessionMiddleware({ req, res })
  }

  return res
}
