import { getGithubContent, getRepoName } from "@/lib/github";
import { createClient } from "embedbase-js";
import { BatchAddDocument } from "embedbase-js/dist/module/types";
import { splitText } from "embedbase-js/dist/main/split";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { batch } from "@/utils/array";

const EMBEDBASE_URL = "https://api.embedbase.xyz";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;

const getApiKey = async (req, res) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient({ req, res });
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
export default async function sync(req: any, res: any) {
  const url = req.body.url;
  const startTime = Date.now();
  const apiKey = await getApiKey(req, res)
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    })
  }
  const embedbase = createClient(EMBEDBASE_URL, apiKey);
  const githubFiles = await getGithubContent(url, GITHUB_TOKEN);
  const repo = getRepoName(url);

  // HACK to create dataset
  embedbase.dataset(repo).add('');

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