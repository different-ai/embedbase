import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'

import Chat from './PublicChat'
// just an example to test app dir
async function getAppName(appId) {
  const supabase = createServerActionClient({ cookies })

  const { data } = await supabase
    .from('apps')
    .select('name')
    .eq('public_api_key', appId)
    .limit(1)
    .single()
  return data?.name
}

export default async function Dashboard(ctx) {
  const appId = ctx.searchParams['appId']
  const appName = await getAppName(appId)

  // const projects = await getProjects()
  if (!appName) {
    return <div>Chat not found</div>
  }

  return (
    <div className="mt-10 w-full">
      <div className="text-md">{appName}</div>
      <Chat />
    </div>
  )
}
