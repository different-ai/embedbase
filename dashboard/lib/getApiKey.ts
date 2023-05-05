import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const getApiKey = async (owner: string) => {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data: apiKey } = await supabase
    .from('api-keys')
    .select('api_key')
    .eq('user_id', owner)
    .single()
  console.log(apiKey)

  return apiKey.api_key
}
