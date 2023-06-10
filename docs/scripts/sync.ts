import glob from 'glob'
import fs from 'fs'
import { createClient, BatchAddDocument } from 'embedbase-js'
import { splitText } from 'embedbase-js/dist/main/split';
import path from 'path';


const batch = async (myList: any[], fn: (chunk: any[]) => Promise<any>) => {
    const batchSize = 100;
    // add to embedbase by batches of size 100
    return Promise.all(
        myList.reduce((acc: BatchAddDocument[][], chunk, i) => {
            if (i % batchSize === 0) {
                acc.push(myList.slice(i, i + batchSize));
            }
            return acc;
            // here we are using the batchAdd method to send the documents to embedbase
        }, []).map(fn)
    )
}
try {
    require("dotenv").config();
} catch (e) {
    console.log("No .env file found" + e);
}
// you can find the api key at https://app.embedbase.xyz
const apiKey = process.env.EMBEDBASE_API_KEY;
// this is using the hosted instance
const url = 'https://api.embedbase.xyz'
const embedbase = createClient(url, apiKey)
const datasetId = `embedbase-documentation`

// const clear = async () => {
//     await embedbase.dataset(datasetId).clear()
// }
// clear()
const sync = async () => {
    const ignored = [
        "node_modules",
        "dist",
        "build",
        "public",
        "env",
        ".next",
        ".git",
    ];
    // read all files under pages/* with .md, .mdx, .ts, .py extension
    const filePaths = glob.sync("../**/*.{md,mdx,ts,py}")
        .filter((p) => !ignored.some((i) => p.includes(i)) &&
            // Check if the path is a file
            fs.statSync(p).isFile());

    const documents = filePaths
        .map((p) => ({
            path:
                // if the file is under docs/ folder, then
                // it is docs (docs.embedbase.xyz)
                p.includes("docs/") ?
                    path.join(
                        "https://docs.embedbase.xyz",
                        p.replace("../", "")
                            .replace("pages/", "/")
                            .replace("index.mdx", "")
                            .replace(".mdx", "")
                    ) :
                    // otherwise it is https://github.com/different-ai/embedbase
                    path.join(
                        "https://github.com/different-ai/embedbase/blob/main",
                        p.replace("../", "")
                    ),
            // content of the file
            data: fs.readFileSync(p, "utf-8")
        }));
    const chunks = []
    documents
        // ignore data with "<|endoftext|>" as it crashes the tokenizer
        .filter((d) => !d.data.includes("<|endoftext|>"))
        // irony is that this script itself crash itself :D
        .map((document) =>
            splitText(document.data, { maxTokens: 500, chunkOverlap: 200 }, async ({ chunk, start, end }) => chunks.push({
                data: chunk,
                metadata: {
                    path: document.path,
                    start,
                    end
                }
            }))
        )

    console.log(`Syncing to ${datasetId} ${chunks.length} documents`);

    return batch(chunks, (chunk) => embedbase.dataset(datasetId).batchAdd(chunk))
        .then((e) => e.flat())
        .then((e) => console.log(`Synced ${e.length} documents to ${datasetId}`))
        .catch(console.error);
}

sync();


