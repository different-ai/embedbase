import {
    TiktokenEncoding,
} from "js-tiktoken/lite";
export interface SplitTextChunk {
    chunk: string
    start: number
    end: number
}
export interface MergeOptions {
    chunkSize?: number
    encodingName?: TiktokenEncoding
    separator?: string
}
export type SplitTextOptions = {
    chunkSize?: number;
    chunkOverlap?: number;
    strategy?: string;
    separator?: string;
    separators?: string[];
    encodingName?: TiktokenEncoding;
    allowedSpecial?: "all" | Array<string>;
    disallowedSpecial?: "all" | Array<string>;
};
