import {
    Tiktoken,
    TiktokenBPE,
    TiktokenEncoding,
    TiktokenModel,
    getEncodingNameForModel,
} from "js-tiktoken/lite";
import { getFetch } from "../utils";
import { MergeOptions, SplitTextChunk, SplitTextOptions } from "./types";

const cache: Record<string, Promise<TiktokenBPE>> = {};

export async function getEncoding(
    encoding: TiktokenEncoding,
    options?: {
        signal?: AbortSignal;
        extendedSpecialTokens?: Record<string, number>;
    }
) {
    if (!(encoding in cache)) {
        cache[encoding] =
            getFetch()(`https://tiktoken.pages.dev/js/${encoding}.json`, {
                signal: options?.signal,
            })
                .then((res) => res.json())
                .catch((e) => {
                    delete cache[encoding];
                    throw e;
                });
    }
    const enc = new Tiktoken(await cache[encoding], options?.extendedSpecialTokens);
    // // @ts-ignore
    // const registry = new FinalizationRegistry((heldValue) => {
    //     heldValue.free()
    // });
    // registry.register(enc);
    return enc
}

export async function encodingForModel(
    model: TiktokenModel,
    options?: {
        signal?: AbortSignal;
        extendedSpecialTokens?: Record<string, number>;
    }
) {
    return getEncoding(getEncodingNameForModel(model), options);
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
export async function splitText(
    text: string,
    options?: SplitTextOptions,
): Promise<SplitTextChunk[]> {
    options = {
        maxTokens: options?.maxTokens ?? 500,
        chunkOverlap: options?.chunkOverlap ?? 200,
        strategy: options?.strategy ?? "token",
        encodingName: options?.encodingName || "cl100k_base",
        allowedSpecial: options?.allowedSpecial ?? [],
        disallowedSpecial: options?.disallowedSpecial ?? [],
    }

    switch (options.strategy) {
        case "character":
            return characterTextSplitter(text, options.maxTokens, options.chunkOverlap, options.separator);
        case "recursiveCharacter":
            return recursiveCharacterTextSplitter(text, options.maxTokens, options.chunkOverlap, options.separators);
        case "markdown":
            return markdownTextSplitter(text, options.maxTokens, options.chunkOverlap);
        case "token":
        default:
            return tokenTextSplitter(text, options.maxTokens, options.chunkOverlap, options.encodingName, options.allowedSpecial, options.disallowedSpecial);
    }
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
    const tokenizer = await getEncoding(options?.encodingName || 'cl100k_base');

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
    // @ts-ignore
    // tokenizer.free();
    return context.join(options?.separator !== undefined ?
        options.separator :
        '\n\n###\n\n');
};


function characterTextSplitter(
    text: string,
    maxTokens: number,
    chunkOverlap: number,
    separator?: string
): SplitTextChunk[] {
    const regex = separator ? new RegExp(separator, "g") : /(?=\S)/g;
    const splits = [];
    let match: RegExpExecArray;

    while ((match = regex.exec(text)) !== null) {
        splits.push({ text: match[0].toString(), index: match.index });

        // Ensure the lastIndex is progressing
        if (regex.lastIndex === match.index) {
            regex.lastIndex++;
        }
    }

    return mergeSplits(splits, separator, maxTokens, chunkOverlap);
}


function recursiveCharacterTextSplitter(
    text: string,
    maxTokens: number,
    chunkOverlap: number,
    separators: string[] = ["\n\n", "\n", " ", ""]
): SplitTextChunk[] {
    const finalChunks: SplitTextChunk[] = [];
    let separator = separators[separators.length - 1];
    for (const s of separators) {
        if (s === "" || text.includes(s)) {
            separator = s;
            break;
        }
    }

    const splits = separator ? text.split(separator) : text.split("");
    let startIndex = 0;

    let goodSplits: Array<{ text: string; index: number }> = [];
    for (const s of splits) {
        if (s.length < maxTokens) {
            goodSplits.push({ text: s, index: startIndex });
        } else {
            if (goodSplits.length) {
                const mergedChunks = mergeSplits(goodSplits, separator, maxTokens, chunkOverlap);
                finalChunks.push(...mergedChunks);
                goodSplits = [];
            }
            const otherInfo = recursiveCharacterTextSplitter(s, maxTokens, chunkOverlap, separators);
            finalChunks.push(...otherInfo);
        }
        startIndex += s.length + separator.length;
    }
    if (goodSplits.length) {
        const mergedChunks = mergeSplits(goodSplits, separator, maxTokens, chunkOverlap);
        finalChunks.push(...mergedChunks);
    }
    return finalChunks;
}

async function tokenTextSplitter(
    text: string,
    maxTokens: number,
    chunkOverlap: number,
    encodingName: TiktokenEncoding,
    allowedSpecial?: "all" | Array<string>,
    disallowedSpecial?: "all" | Array<string>
): Promise<SplitTextChunk[]> {
    const tokenizer = await getEncoding(encodingName);

    const splits: SplitTextChunk[] = [];
    const input_ids = tokenizer.encode(text, allowedSpecial, disallowedSpecial);

    let start_idx = 0;
    let cur_idx = Math.min(start_idx + maxTokens, input_ids.length);
    let chunk_ids = input_ids.slice(start_idx, cur_idx);
    let startIndex = 0;

    while (start_idx < input_ids.length) {
        const chunkText = tokenizer.decode(chunk_ids);
        const endIndex = startIndex + chunkText.length;
        splits.push({ chunk: chunkText, start: startIndex, end: endIndex });

        start_idx += maxTokens - chunkOverlap;
        cur_idx = Math.min(start_idx + maxTokens, input_ids.length);
        chunk_ids = input_ids.slice(start_idx, cur_idx);
        startIndex = endIndex - chunkOverlap;
    }
    // @ts-ignore
    // tokenizer.free();

    return splits;
}

function markdownTextSplitter(text: string, maxTokens: number, chunkOverlap: number): SplitTextChunk[] {
    const separators = [
        "\n## ", "\n### ", "\n#### ", "\n##### ", "\n###### ",
        "```\n\n",
        "\n\n***\n\n", "\n\n---\n\n", "\n\n___\n\n",
        "\n\n", "\n", " ", "",
    ];
    return recursiveCharacterTextSplitter(text, maxTokens, chunkOverlap, separators);
}

function mergeSplits(
    splits: Array<{ text: string; index: number }>,
    separator: string,
    maxTokens: number,
    chunkOverlap: number
): SplitTextChunk[] {
    const chunks: SplitTextChunk[] = [];
    const currentDoc = [];
    let total = 0;
    for (const d of splits) {
        const _len = d.text.length;
        if (total + _len >= maxTokens) {
            if (total > maxTokens) {
                console.warn(`Created a chunk of size ${total}, which is longer than the specified ${maxTokens}`);
            }
            if (currentDoc.length > 0) {
                const chunk = joinDocs(currentDoc, separator);
                if (chunk !== null) {
                    chunks.push(chunk);
                }
                while (total > chunkOverlap || (total + _len > maxTokens && total > 0)) {
                    total -= currentDoc[0].text.length;
                    currentDoc.shift();
                }
            }
        }
        currentDoc.push(d);
        total += _len;
    }
    const chunk = joinDocs(currentDoc, separator);
    if (chunk !== null) {
        chunks.push(chunk);
    }
    return chunks;
}

function joinDocs(docs: Array<{ text: string; index: number }>, separator: string): SplitTextChunk | null {
    const text = docs.map(d => d.text).join(separator).trim();
    if (text === "") {
        return null;
    } else {
        const startIndex = docs[0].index;
        const endIndex = docs[docs.length - 1].index + docs[docs.length - 1].text.length;
        return { chunk: text, start: startIndex, end: endIndex };
    }
}