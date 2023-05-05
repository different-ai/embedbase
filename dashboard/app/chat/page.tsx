import { createServerComponentSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'

import Chat from './Chat'
// just an example to test app dir
async function getAppName(appId: string) {
  console.log('getAppName', appId)

  const supabase = createServerComponentSupabaseClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    headers: () => headers(),
    cookies: () => cookies(),
  })

  const { data } = await supabase
    .from('apps')
    .select('name')
    .eq('public_api_key', appId)
    .single()
  console.log(data)
  return data.name
}

export default async function Dashboard(ctx) {
  const appId = ctx.searchParams['appId']
  const appName = await getAppName(appId)

  // const projects = await getProjects()

  return (
    <div className="mt-10 w-full">
      <div className="text-md">{appName}</div>
      <Chat />
    </div>
  )
}
