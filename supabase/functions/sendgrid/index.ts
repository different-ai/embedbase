// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { fetch } from "https://esm.sh/v117/cross-fetch@3.1.5/deno/cross-fetch.mjs";

serve(async (req: any) => {
  // get from header x-sendgrid-api-key
  const sendgridApiKey = req.headers.get('x-sendgrid-api-key')
  if (!sendgridApiKey) {
    console.error('No sendgridApiKey provided')
    return new Response(
      JSON.stringify({ error: 'No sendgridApiKey provided' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
  const body = await req.json()

  const email = body?.record?.email
  if (!email) {
    console.error('No email provided')
    return new Response(
      JSON.stringify({ error: 'No email provided' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sendgridApiKey}`,
    },
    body: JSON.stringify({
      template_id: Deno.env.get('SENDGRID_TEMPLATE_ID'),
      dynamic_template_data: {
        email: Deno.env.get('SENDGRID_FROM_EMAIL')
      },
      personalizations: [
        {
          to: [
            {
              email,
            },
          ],
          subject: 'Welcome to Embedbase',
        },
      ],
      from: {
        email: Deno.env.get('SENDGRID_FROM_EMAIL'),
      },
    }),
  })

  console.log(response)

  return new Response(
    null,
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
})

/*
Deploy with:
SUPABASE_PROJECT_ID=$(cat .env.local | grep SUPABASE_PROJECT_ID | cut -d '=' -f2)

supabase link  --project-ref $SUPABASE_PROJECT_ID

supabase functions deploy sendgrid --no-verify-jwt --project-ref $SUPABASE_PROJECT_ID

View all secrets

supabase secrets list 

Set secrets for your project


eg
supabase secrets set SENDGRID_TEMPLATE_ID=1234
supabase secrets set SENDGRID_FROM_EMAIL=1234

Unset secrets for your project

supabase secrets unset NAME1 NAME2 
*/

/* To invoke:
# read from .env.local
URL=http://localhost:54321/functions/v1/
URL=https://$SUPABASE_PROJECT_ID.functions.supabase.co/sendgrid
curl -X POST $URL --header 'Content-Type: application/json' -d '{"record": {"email": "foo@bar.xyz"}}'
*/
