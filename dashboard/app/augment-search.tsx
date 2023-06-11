
'use server'

interface AugmentSearchQueryProps {
    model: 'ada' | 'palm2' | 'chatgpt' | 'davinci'
}
export default async function augmentSearchQuery(query: string, options?: AugmentSearchQueryProps): Promise<string> {
    // curl -X POST https://llm-usx5gpslaq-uc.a.run.app -H "Content-Type: application/json" -d '{"prompt": "tell me a story about animals"}'


    const model = options?.model || 'chatgpt'
    console.log('model', model)

    let textResponse = ''
    if (model === 'palm2') {
        const prompt = `This is the what the user asked: ${query}
    
You are an AI assistant that helps a user search within a data table.
The user ask questions and your only task is to turn these questions into a longer semantic search query
that will be used to search within this data table.
The query that you will generate must create a search query that will return
the most relevant results to help the user find what he asked for.
For your information the query you will generate will be compared to other documents that are typically long
of multiple sentences, up to 500 tokens sometimes or more so you have to generate
a query that is long enough to be compared to these documents.`


        const response = await fetch('https://llm-usx5gpslaq-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt }),
        }).then((res) => res.json())
        console.log('response palm', response)

        textResponse = response.answer
    }
    else if (model === 'ada') {
        const prompt = `This is the what the user asked: ${query}
    
You are an AI assistant that helps a user search within a data table.
The user ask questions and your only task is to turn these questions into a longer semantic search query
that will be used to search within this data table.
The query that you will generate must create a search query that will return
the most relevant results to help the user find what he asked for.
For your information the query you will generate will be compared to other documents that are typically long
of multiple sentences, up to 500 tokens sometimes or more so you have to generate
a query that is long enough to be compared to these documents.`

        const response = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'text-ada-001',
                prompt: prompt,
                max_tokens: 1000,
            })
        }).then((res) => res.json())
        console.log('response ada', response)
        textResponse = response.choices[0].text
    } else if (model === 'chatgpt') {
        const prompt = `This is the what the user asked: ${query}`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system', content: `You are an AI assistant that helps a user search within a data table.
The user ask questions and your only task is to turn these questions into a longer semantic search query
that will be used to search within this data table.
The query that you will generate must create a search query that will return
the most relevant results to help the user find what he asked for.
For your information the query you will generate will be compared to other documents that are typically long
of multiple sentences, up to 500 tokens sometimes or more so you have to generate
a query that is long enough to be compared to these documents. Your response will directly be used in the semantic search engine so don't add any additional words around it.` },
                    { role: 'user', content: prompt }
                ],
                stream: false,
            }),
        }).then((res) => res.json())
        console.log('response chatgpt', response)

        textResponse = response.choices[0].message.content
    }
    console.log('textResponse', textResponse)
    return textResponse
}