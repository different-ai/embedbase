import { createClient } from "embedbase-js";
import { splitText } from "embedbase-js/dist/main/split";
import { EMBEDBASE_CLOUD_URL } from "../../utils/constants";
import { nearestNeighbors } from "../../utils/vectors";
import { CreateContextResponse } from "../../utils/types";
import { get_encoding, TiktokenEncoding } from '@dqbd/tiktoken'

export const merge = async (chunks: string[], maxLen = 1800) => {
  let curLen = 0;
  const tokenizer = get_encoding('cl100k_base')

  const context = [];
  for (const chunk of chunks) {
    const nTokens = tokenizer.encode(chunk).length;
    curLen += nTokens + 4;
    if (curLen > maxLen) {
      break;
    }
    context.push(chunk);
  }
  return context.join('\n\n###\n\n');
};

export async function getEmbeddings(strings: string[]) {
  const model = 'text-embedding-ada-002'
  const data = {
    "input": strings,
    "model": model
  }
  try {

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
      }
    }).then((res) => res.json());
    return response;
  } catch (error) {
    console.log(error);
    return { data: [] };
  }
}

export async function embedText(text: string): Promise<number[]> {
  // If the text is empty, skip it
  if (text === '') {
    return [];
  }
  let chunks = [text];
  // If the text is too long, split it into chunks of 2000 characters
  if (text.length > 2000) {
    chunks = [];
    let chunk = '';
    for (let i = 0; i < text.length; i++) {
      chunk += text[i];
      if (i % 2000 === 0) {
        chunks.push(chunk);
        chunk = '';
      }
    }
  }

  const resp = await getEmbeddings(chunks);

  let embedding: number[] = [];
  if (chunks.length === 1) {
    embedding = resp.data[0].embedding
  } else {
    let allEmbeddings: number[][] = resp.data.map((item: any) => item.embedding);
    embedding = allEmbeddings.reduce((prev: number[], curr: number[]) => {
      return prev.map((item: number, index: number) => item + curr[index]);
    }
    ).map((item: number) => item / allEmbeddings.length);
  }

  return embedding;
}

const createContext = async (
  question: string,
  datasetIds: string[],
  apiKey: string
): Promise<CreateContextResponse> => {
  const embedbase = createClient(EMBEDBASE_CLOUD_URL, apiKey);
  const results = await Promise.all(
    datasetIds.map(async (datasetId) =>
      embedbase.dataset(datasetId).search(question, { limit: 10 })
    )
  );
  // const queryEmbedding = await embedText(question);

  const similarities = results.flatMap((r) => r);
  // const topResults = nearestNeighbors({
  //   data: question,
  //   embedding: queryEmbedding
  // }, similarities, 15);
  const topResults = similarities.sort(() => Math.random() - 0.5).slice(0, 15);
  // if the dataset has been indexed
  // using path in the metadata,
  // we can return the reference
  // as a stringified JSON object
  // otherwise, we return the data string
  const datas = topResults.map((r: any) => {
    if (r?.metadata?.path) {
      return JSON.stringify({
        data: r.data,
        reference: r.metadata.path
      })
    }
    return r.data;
  });
  const chunkedContext = await merge(datas);
  return { chunkedContext: chunkedContext, contexts: topResults };
};

// 2. Get a context from a dataset
export default async function buildPrompt(req: any, res: any) {
  const prompt = req.body.prompt;
  if (!prompt) {
    res.status(400).json({ error: "No prompt" });
    return;
  }
  const datasetIds = req.body.datasetIds;
  if (!datasetIds) {
    res.status(400).json({ error: "No datasetIds" });
    return;
  }

  const apiKey = req.body.apiKey;
  if (!apiKey) {
    res.status(400).json({ error: "No apiKey" });
    return;
  }


  const context = await createContext(prompt, datasetIds, apiKey);
  res.status(200).json(context);
}
