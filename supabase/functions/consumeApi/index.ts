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
  let userId: string | null = null
  if (apiKey) {
    const { data: apiKeyRow, error: errorApiKey } = await supabaseClient
      .from('api-keys')
      .select('*')
      .eq('api_key', apiKey)
      .limit(1)
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
    userId = apiKeyRow.user_id
  } else if (body.userId) {
    userId = body.userId
  } else {
    return new Response(
      JSON.stringify({ error: 'Unauthorized, no API key or userId' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // get stripe subscription from supabase
  const { data: stripeSubscription } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['trialing', 'active'])
    .limit(1)
    .single()

  // now read the view "current_plan_period_usage" to check
  // if the user has exceeded the limit
  const { data: currentPlanPeriodUsage, error: errorCurrentPlanPeriodUsage } = await supabaseClient
    .from('current_plan_period_usage')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (errorCurrentPlanPeriodUsage) {
    console.error(errorCurrentPlanPeriodUsage)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  if (currentPlanPeriodUsage?.total_usage > currentPlanPeriodUsage?.limit) {
    return new Response(
      JSON.stringify({
        error: 'Plan limit exceeded, please upgrade on the dashboard.' +
          ' If you are building open-source, please contact us at louis@embedbase.xyz'
      }),
      {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  // if there are no subscriptions, it means free plan
  // in either case, log usage for the plan
  await supabaseClient
    .from('plan_usages')
    .insert([
      {
        plan_id: stripeSubscription?.plan_id ?? Deno.env.get('FREE_PLAN_ID'),
        user_id: userId,
        usage: 1,
      },
    ])


  return new Response(
    JSON.stringify({ userId, currentPlanPeriodUsage }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})

/*
Deploy with:

supabase link  --project-ref $SUPABASE_PROJECT_ID

supabase functions deploy consumeApi --no-verify-jwt --project-ref $SUPABASE_PROJECT_ID

View all secrets

supabase secrets list 

Set secrets for your project

supabase secrets set NAME1=VALUE1 NAME2=VALUE2 

eg
supabase secrets set SUPABASE_URL=1234
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=1234
supabase secrets set FREE_PLAN_ID=1234

Unset secrets for your project

supabase secrets unset NAME1 NAME2 
*/

/* To invoke:
# read from .env.local
EMBEDBASE_API_KEY=$(cat .env.local | grep EMBEDBASE_API_KEY | cut -d '=' -f2)
SUPABASE_PROJECT_ID=$(cat .env.local | grep SUPABASE_PROJECT_ID | cut -d '=' -f2)
URL=http://localhost:54321/functions/v1/
URL=https://$SUPABASE_PROJECT_ID.functions.supabase.co/consumeApi
curl -X POST $URL --header 'Content-Type: application/json' -d '{"apiKey": "'$EMBEDBASE_API_KEY'"}'
*/
