import { get_encoding, TiktokenEncoding } from '@dqbd/tiktoken'
import { SplitTextChunk } from './types';

const MAX_CHUNK_LENGTH = 8191
const EMBEDDING_ENCODING: TiktokenEncoding = 'cl100k_base'
const CHUNK_OVERLAP = 0

interface SplitTextOptions {
  maxTokens?: number
  chunkOverlap?: number
  encodingName?: TiktokenEncoding
}
/**
 * Split a text into chunks of max_tokens length.
 * Depending on the model used, you may want to adjust the max_tokens and chunk_overlap parameters.
 * For example, if you use the OpenAI embeddings model, you can use max_tokens of 500 and chunk_overlap of 200.
 * While if you use "all-MiniLM-L6-v2" of sentence-transformers, you might use max_tokens of 30 and chunk_overlap of 20
 * because the model has a relatively limited input size.
 * (embedbase cloud use openai model at the moment)
 *
 * ### Example
 *
 * ```typescript
 * const text = "This is a sample text to demonstrate the usage of the split_text function. \
 * It can be used to split long texts into smaller chunks based on the max_tokens value given. \
 * This is useful when using models that have a limited input size."
 *
 * // Split the text into chunks of maximum 10 tokens
 * const chunks = splitText(text, { maxTokens: 10 })
 * ```
 */
export function splitText(
  text: string,
  {
    maxTokens = MAX_CHUNK_LENGTH,
    chunkOverlap = CHUNK_OVERLAP,
    encodingName = EMBEDDING_ENCODING,
  }: SplitTextOptions,
  callback?: (chunk: SplitTextChunk) => void
): SplitTextChunk[] {
  if (chunkOverlap >= maxTokens) {
    throw new Error('Cannot have chunkOverlap >= chunkSize')
  }
  const tokenizer = get_encoding(encodingName)

  const input_ids = tokenizer.encode(text)
  const chunkSize = maxTokens

  let start_idx = 0
  let cur_idx = Math.min(start_idx + chunkSize, input_ids.length)
  let chunk_ids = input_ids.slice(start_idx, cur_idx)

  const decoder = new TextDecoder()
  const chunks = []

  while (start_idx < input_ids.length) {
    const chunk = decoder.decode(tokenizer.decode(chunk_ids))
    const chunkItem = { chunk, start: start_idx, end: cur_idx }
    chunks.push(chunkItem)
    callback && callback(chunkItem)
    start_idx += chunkSize - chunkOverlap
    cur_idx = Math.min(start_idx + chunkSize, input_ids.length)
    chunk_ids = input_ids.slice(start_idx, cur_idx)
  }
  tokenizer.free()
  return chunks
}

interface MergeOptions {
  maxLen?: number
  encodingName?: TiktokenEncoding
  separator?: string
}
/**
 * This function takes a list of `chunks` and optional parameters `max_len`, `encoding_name`, and `separator`.
 * It encodes each chunk using the specified tokenizer, checks if the current length exceeds the `max_len`,
 * breaks if it does, and appends the chunk to the `context` list.
 * Finally, it joins the context list with the specified separator
 * (default is '\\n\\n###\\n\\n') and returns the merged string.
 *
 * For example,
 * ```typescript
 * const chunks = ['Hello', 'world', '!']
 * const mergedText = await merge(chunks, { maxLen: 10 })
 * ```
 * will return
 * ```
 * 'Hello world!'
 * ```
 */
export const merge = async (chunks: string[], options?: MergeOptions): Promise<string> => {
  const tokenizer = get_encoding(options?.encodingName || EMBEDDING_ENCODING)

  let curLen = 0;
  const context = [];
  for (const chunk of chunks) {
    const nTokens = tokenizer.encode(chunk).length;
    curLen += nTokens + 4;
    if (curLen > (options?.maxLen || 1800)) {
      break;
    }
    context.push(chunk);
  }
  return context.join(options?.separator !== undefined ?
    options.separator :
    '\n\n###\n\n');
};
