const glob = require("glob");
const fs = require("fs");
import { createClient, BatchAddDocument } from 'embedbase-js'
import { splitText } from 'embedbase-js/dist/main/split';


const hash = (t: number): string =>
    t.toString(36).replace(/[^a-z]+/g, '');

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

const sync = async () => {
    // read all files under pages/* with .mdx extension
    // for each file, read the content
    // TODO: sync whole repository, everything!
    const documents = glob.sync("pages/**/*.mdx").map((path) => ({
        path: "https://docs.embedbase.xyz" +
            path.replace("pages/", "/").replace("index.mdx", "").replace(".mdx", ""),
        // content of the file
        data: fs.readFileSync(path, "utf-8")
    }));
    const chunks = []
    documents.map((document) =>
        splitText(document.data, { maxTokens: 500, chunkOverlap: 200 }, async ({ chunk, start, end }) => chunks.push({
            data: chunk,
            metadata: {
                path: document.path,
                start,
                end
            }
        }))
    )
    // embedbase-doc-[hash of timestamp]
    // const datasetId = `embedbase-doc-${hash(new Date().getTime())}`
    // HACK: implement a way to always use latest version of dataset
    const datasetId = `embedbase-documentation`

    console.log(`Syncing to ${datasetId} ${chunks.length} documents`);


    const batchSize = 100;
    // add to embedbase by batches of size 100
    return Promise.all(
        chunks.reduce((acc: BatchAddDocument[][], chunk, i) => {
            if (i % batchSize === 0) {
                acc.push(chunks.slice(i, i + batchSize));
            }
            return acc;
        }, []).map((chunk) => embedbase.dataset(datasetId).batchAdd(chunk))
    )
        .then((e) => e.flat())
        .then((e) => console.log(`Synced ${e.length} documents to ${datasetId}`))
        .catch(console.error);
}

sync();
