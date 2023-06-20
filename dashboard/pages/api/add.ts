import { addToEmbedbase } from '@/lib/cache'
import cors from '@/utils/cors'
import * as Sentry from '@sentry/nextjs'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { Document } from 'embedbase-js'
import { v4 } from 'uuid'

export const config = {
    runtime: 'edge',
}

type AddRequest = {
    documents: Document[]
    dataset_id: string
}

export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
}

export default async function add(req: Request, res: Response) {
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

    const userId = req.headers.get('userId')
    console.log('userId', userId)

    try {
        // @ts-ignore
        const supabase = createMiddlewareClient({ req, res })

        const data = await addToEmbedbase(supabase, documents, dataset_id, userId)
        console.log('done', data)
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
        Sentry.captureException(error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: CORS_HEADERS,
        })
    }
}
