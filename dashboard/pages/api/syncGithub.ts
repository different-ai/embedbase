import { getGithubContent, getRepoName } from "@/lib/github";
import { createClient } from "embedbase-js";
import { BatchAddDocument } from "embedbase-js/dist/module/types";
import { createMiddlewareSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { batch } from "@/utils/array";

const EMBEDBASE_URL = "https://api.embedbase.xyz";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;

export const config = {
  runtime: 'edge'
}

// @ts-expect-error
import wasm from "../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module";
import model from "@dqbd/tiktoken/encoders/cl100k_base.json";
import { init, Tiktoken } from "@dqbd/tiktoken/lite/init";

interface SplitTextChunk {
    chunk: string
    start: number
    end: number
}
const MAX_CHUNK_LENGTH = 8191
const EMBEDDING_ENCODING = 'cl100k_base'
const CHUNK_OVERLAP = 0


async function splitText(
    text: string,
    {
        maxTokens = MAX_CHUNK_LENGTH,
        chunkOverlap = CHUNK_OVERLAP,
        encodingName = EMBEDDING_ENCODING,
    }: { maxTokens?: number; chunkOverlap?: number; encodingName?: any },
    callback?: (chunk: SplitTextChunk) => void
): Promise<SplitTextChunk[]> {
    if (chunkOverlap >= maxTokens) {
        throw new Error('Cannot have chunkOverlap >= chunkSize')
    }
    await init((imports) => WebAssembly.instantiate(wasm, imports));

    const encoding = new Tiktoken(
        model.bpe_ranks,
        model.special_tokens,
        model.pat_str
    );

    const input_ids = encoding.encode(text)
    const chunkSize = maxTokens

    let start_idx = 0
    let cur_idx = Math.min(start_idx + chunkSize, input_ids.length)
    let chunk_ids = input_ids.slice(start_idx, cur_idx)

    const decoder = new TextDecoder()
    const chunks = []

    while (start_idx < input_ids.length) {
        const chunk = decoder.decode(encoding.decode(chunk_ids))
        const chunkItem = { chunk, start: start_idx, end: cur_idx }
        chunks.push(chunkItem)
        callback && callback(chunkItem)
        start_idx += chunkSize - chunkOverlap
        cur_idx = Math.min(start_idx + chunkSize, input_ids.length)
        chunk_ids = input_ids.slice(start_idx, cur_idx)
    }
    encoding.free()
    return chunks
}


const getApiKey = async (req: Request, res: Response) => {
  // Create authenticated Supabase Client
  // @ts-ignore
  const supabase = createMiddlewareSupabaseClient({ req, res });
  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let apiKey: string = ''

  try {
    const { data, status, error } = await supabase
      .from('api-keys')
      .select()
      .eq('user_id', session?.user?.id)

    if (error && status !== 406) {
      throw error
    }
    // get the first api key
    apiKey = data[0].api_key
    if (!apiKey) {
      throw new Error('No API key found')
    }

  } catch (error) {
    console.log(error)
  }
  return apiKey
}

// 1. Sync all the docs from a github repo onto embedbase
export default async function sync(req: Request, res: Response) {
  const body = await req.json()
  const url = body.url
  const startTime = Date.now();
  const apiKey = await getApiKey(req, res)
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    })
  }
  if (!url) {
    return new Response(JSON.stringify({ error: 'No URL provided' }), {
      status: 400,
    })
  }
  const embedbase = createClient(EMBEDBASE_URL, apiKey);
  console.log(`Syncing ${url}...`);
  const githubFiles = await getGithubContent(url, GITHUB_TOKEN);
  const repo = getRepoName(url);
  console.log(`Found ${githubFiles.length} files in ${repo}`);

  // HACK to create dataset
  await embedbase.dataset(repo).add('.');

  const chunks: BatchAddDocument[] = [];
  githubFiles.forEach((file) =>
    // ignore chunks containing <|endoftext|>
    // because it crashes the tokenizer
    !file.content.includes("<|endoftext|>") &&
    splitText(
      file.content,
      { maxTokens: 500, chunkOverlap: 200 },
      ({ chunk }) =>

        chunks.push({
          data: chunk,
          metadata: file.metadata,
        })
    ));
  await batch(chunks, (chunk) => embedbase.dataset(repo).batchAdd(chunk))
  console.log(`Synced ${chunks.length} docs from ${repo} in ${Date.now() - startTime}ms`)
  return new Response(JSON.stringify({ message: 'Syncing' }), {
    status: 200,
  })
  // .catch((error) => res.status(500).json({ error: error }))
  // .then(() => res.status(200));
}