// look at the link below to improve implementation
// for example addings types to supabase
// see https://github.com/supabase/auth-helpers/blob/main/examples/nextjs-server-components/db_types.ts
import { headers, cookies } from 'next/headers'
import { createServerComponentSupabaseClient } from '@supabase/auth-helpers-nextjs'

// import { Database } from '../db_types';

export const createServerClient = () =>
  createServerComponentSupabaseClient({
    headers,
    cookies,
  })
