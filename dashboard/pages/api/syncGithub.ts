import { getGithubContent, getRepoName } from "@/lib/github";
import { batch } from "@/utils/array";
import { createMiddlewareSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { BatchAddDocument, createClient, splitText } from "embedbase-js";

const EMBEDBASE_URL = "https://api.embedbase.xyz";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;

export const config = {
  runtime: 'edge'
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
  const embedbase = createClient(EMBEDBASE_URL, apiKey, { browser: true });

  console.log(`Syncing ${url}...`);
  const githubFiles = await getGithubContent(url, GITHUB_TOKEN);
  const repo = getRepoName(url);
  console.log(`Found ${githubFiles.length} files in ${repo}`);

  // HACK to create dataset
  await embedbase.dataset(repo).add('.');

  const chunks: BatchAddDocument[] = [];
  // TODO this is quite ugly
  await Promise.all(githubFiles
    // ignore chunks containing <|endoftext|>
    // because it crashes the tokenizer
    .filter((file) => !file.content.includes("<|endoftext|>"))
    .map((file) =>
      splitText(file.content).then((c) =>
        c.map(({ chunk }) => chunks.push({
          data: chunk,
          metadata: file.metadata,
        })
        )
      )));
  await batch(chunks, (chunk) => embedbase.dataset(repo).batchAdd(chunk))
  console.log(`Synced ${chunks.length} docs from ${repo} in ${Date.now() - startTime}ms`)
  return new Response(JSON.stringify({ message: 'Syncing' }), {
    status: 200,
  })
}