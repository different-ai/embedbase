import { createClient } from "embedbase-js";
import { splitText } from 'embedbase-js/dist/main/split';

const datasetId = "embedbase-documentation";
const url = "https://api.embedbase.xyz";
const apiKey = process.env.EMBEDBASE_API_KEY!;
const embedbase = createClient(url, apiKey);

const createContext = async (question: string) => {
  const results = await embedbase
    .dataset(datasetId)
    .createContext(question, { limit: 15 });

  const mergedResults = results.join("\n");
  const chunks = splitText(mergedResults, {});
  return chunks[0].chunk;
};

export default async function buildPrompt(req, res) {
  const prompt = req.body.prompt;

  const context = await createContext(prompt);
  const newPrompt = `Answer the question based on the context below, and if the question can't be answered based on the context, say "I don't know"\n\nContext: ${context}\n\n---\n\nQuestion: ${prompt}\nAnswer:`;

  res.status(200).json({ prompt: newPrompt });
}