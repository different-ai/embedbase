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
// should index chunks
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
