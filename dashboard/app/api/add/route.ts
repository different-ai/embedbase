import { addToEmbedbase } from '@/lib/cache'
import cors from '@/utils/cors'
// import * as Sentry from '@sentry/nextjs'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { Document } from 'embedbase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { v4 } from 'uuid'

const PROJECT_ID = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
    'https://',
    ''
)?.replace('.supabase.co', '')

const track = async (userId: string) => {
    await fetch(
        'https://app.posthog.com/capture/',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: 'phc_plfzAimxHysKLaS80RK3NPaL0OJhlg983m3o5Zuukp',
                event: 'add',
                distinct_id: userId,
            }),
        }
    )
}

export const runtime = 'edge'
// HACK: https://github.com/vercel/next.js/issues/49373
export const dynamic = 'force-dynamic'
// export const dynamic = 'force-static'
type AddRequest = {
    documents: Document[]
    dataset_id: string
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
}

const credentials = {
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
}

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies }, credentials)

    // The `cors` snippet says the preflight OPTIONS is handled, but it's not stable!
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: CORS_HEADERS,
        })
    }
    console.log('starting')
    const { documents, dataset_id } = (await req.json()) as AddRequest
    if (!documents) {
        return new Response(JSON.stringify({ error: 'No documents' }), {
            status: 400,
        })
    }

    if (!dataset_id) {
        return new Response(JSON.stringify({ error: 'No dataset_id' }), {
            status: 400,
        })
    }

    try {
        // check if there is an api key in the headers
        const apiKey = req.headers.get('Authorization')

        const endpoint = 'add'

        // get the bearer token
        const split = apiKey.split(' ')
        if (split.length !== 2) {
            return new Response(JSON.stringify({ error: 'No bearer token' }), {
                status: 401,
            })
        }

        const token = split[1]
        // call https://$SUPABASE_PROJECT_ID.functions.supabase.co/consumeApi
        const response = await fetch(
            `https://${PROJECT_ID}.functions.supabase.co/consumeApi`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: token, endpoint: endpoint }),
            }
        )

        // if we have a user id then we can continue
        if (!response.ok) {
            return new Response(JSON.stringify({ error: 'No user id' }), {
                status: 401,
            })
        }

        const { userId } = await response.json()

        track(userId)

        const data = await addToEmbedbase(supabase, documents, dataset_id, userId)
        return cors(
            req,
            new Response(JSON.stringify({
                results: data,
                dataset_id: dataset_id,
                id: v4(),
                created: Date.now(),
            }), {
                status: 200,
            })
        )
    } catch (error) {
        console.error(error)
        // TODO: Sentry does not support app dir?
        // Sentry.captureException(error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: CORS_HEADERS,
        })
    }

}



