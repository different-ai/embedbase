// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req: any) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  // Create a Supabase client with the Auth context of the logged in user.
  const supabaseClient = createClient(
    // Supabase API URL - env var exported by default.
    Deno.env.get('SUPABASE_URL') ?? '',
    // Supabase API ANON KEY - env var exported by default.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    // Create client with Auth context of the user that called the function.
    // This way your row-level-security (RLS) policies are applied.
    // { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  const body = await req.json()

  const apiKey = body.apiKey

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized, missing API key' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const { data: apiKeyRow, error: errorApiKey } = await supabaseClient
    .from('api-keys')
    .select('*')
    .eq('api_key', apiKey)
    .single()

  if (!apiKeyRow || errorApiKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized, invalid API key' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  return new Response(
    JSON.stringify({
      userId: apiKeyRow.user_id,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})

/* To invoke:
# read from .env.local
EMBEDBASE_API_KEY=$(cat .env.local | grep EMBEDBASE_API_KEY | cut -d '=' -f2)
SUPABASE_PROJECT_ID=$(cat .env.local | grep SUPABASE_PROJECT_ID | cut -d '=' -f2)
URL=http://localhost:54321/functions/v1/
URL=https://$SUPABASE_PROJECT_ID.functions.supabase.co/apiKey
curl -X POST $URL --header 'Content-Type: application/json' -d '{"apiKey": "'$EMBEDBASE_API_KEY'"}'
*/
