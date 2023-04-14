// import { createClient } from "embedbase-js";
// // import wasm from "@dqbd/tiktoken/lite/tiktoken_bg.wasm?module";
// const wasm = require("@dqbd/tiktoken/lite/tiktoken_bg.wasm");
// import model from "@dqbd/tiktoken/encoders/cl100k_base.json";
// import { init, Tiktoken } from "@dqbd/tiktoken/lite/init";
// // import { get_encoding, TiktokenEncoding } from '@dqbd/tiktoken'
// import { OpenAIStream, OpenAIStreamPayload } from "../../utils/OpenAIStream";
// export const config = {
//   runtime: "edge",
// };


// export interface SplitTextChunk {
//   chunk: string
//   start: number
//   end: number
// }
// const MAX_CHUNK_LENGTH = 8191
// const EMBEDDING_ENCODING = 'cl100k_base'
// const CHUNK_OVERLAP = 0


// export async function splitText(
//   text: string,
//   {
//     maxTokens = MAX_CHUNK_LENGTH,
//     chunkOverlap = CHUNK_OVERLAP,
//     encodingName = EMBEDDING_ENCODING,
//   }: { maxTokens?: number; chunkOverlap?: number; encodingName?: any },
//   callback?: (chunk: SplitTextChunk) => void
// ): Promise<SplitTextChunk[]> {
//   if (chunkOverlap >= maxTokens) {
//     throw new Error('Cannot have chunkOverlap >= chunkSize')
//   }
//   await init((imports) => WebAssembly.instantiate(wasm, imports));

//   const encoding = new Tiktoken(
//     model.bpe_ranks,
//     model.special_tokens,
//     model.pat_str
//   );

//   const input_ids = encoding.encode(text)
//   const chunkSize = maxTokens

//   let start_idx = 0
//   let cur_idx = Math.min(start_idx + chunkSize, input_ids.length)
//   let chunk_ids = input_ids.slice(start_idx, cur_idx)

//   const decoder = new TextDecoder()
//   const chunks = []

//   while (start_idx < input_ids.length) {
//     const chunk = decoder.decode(encoding.decode(chunk_ids))
//     const chunkItem = { chunk, start: start_idx, end: cur_idx }
//     chunks.push(chunkItem)
//     callback && callback(chunkItem)
//     start_idx += chunkSize - chunkOverlap
//     cur_idx = Math.min(start_idx + chunkSize, input_ids.length)
//     chunk_ids = input_ids.slice(start_idx, cur_idx)
//   }
//   encoding.free()
//   return chunks
// }


// const datasetId = "embedbase-documentation";
// const url = "https://api.embedbase.xyz";
// const apiKey = process.env.EMBEDBASE_API_KEY!;
// const embedbase = createClient(url, apiKey);

// const createContext = async (question: string) => {
//   const results = await embedbase
//     .dataset(datasetId)
//     .createContext(question, { limit: 15 });

//   const mergedResults = results.join("\n");
//   const chunks = await splitText(mergedResults, {});
//   return chunks[0].chunk;
// };

// export default async function ask(req, res) {
//   const prompt = req.body.prompt;

//   const context = await createContext(prompt);
//   const newPrompt = `Answer the question based on the context below, and if the question can't be answered based on the context, say "I don't know"\n\nContext: ${context}\n\n---\n\nQuestion: ${prompt}\nAnswer:`;

//   const payload: OpenAIStreamPayload = {
//     // model: "gpt-4",
//     model: "gpt-3.5-turbo",
//     messages: [{ role: "user", content: newPrompt }],
//     stream: true,
//   };

//   const stream = await OpenAIStream(payload);
//   return new Response(stream);
// }

export default async function ask(req, res) {

}
