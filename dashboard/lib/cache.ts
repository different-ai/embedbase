
import { embed } from "@/utils/vectors";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";
import { Document } from "embedbase-js";
import { v4 } from 'uuid';
import { upstashRest } from "./upstash";

const embedder = {
    isTooBig: (data) => {
        // TODO: count tokens
        return data.length > 3000;
    },

};
const cache = {
    getEmbedding: async (hash: string) => {
        // Assuming `upstashRest` is already imported and set up for your Redis implementation.
        const embedding = await upstashRest(['GET', hash]);
        return (embedding.result) ? JSON.parse(embedding.result) : null;
    },
    setEmbedding: async (hash: string, embedding: any) => {
        const embeddingString = JSON.stringify(embedding);
        await upstashRest(['SET', hash, embeddingString]);
    }
}

const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        hash = (hash << 5) - hash + charCode;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to hexadecimal string
    return (hash >>> 0).toString(16);
};

const checkAndComputeEmbeddings = async (documents: Document[]) => {
    const processedDocuments: Document[] = [];
    const documentsToEmbed: Document[] = [];

    console.log("Checking and computing embeddings for", documents.length, "documents");
    for (const document of documents) {
        const data = document.data;
        document.id = v4();

        if (embedder.isTooBig(data)) {
            throw new Error("Document is too long, please split it into smaller documents");
        }

        const hash = hashString(data);

        if (processedDocuments.some((doc) => doc.hash === hash)) {
            continue;
        }

        let embedding = await cache.getEmbedding(hash);

        if (!embedding) {
            documentsToEmbed.push({ ...document, hash });
        } else {
            processedDocuments.push({
                ...document,
                hash,
                embedding,
            });
        }
    }

    // print the diff from cache
    console.log("Documents to embed:", documentsToEmbed.length);
    console.log("Documents already in cache:", processedDocuments.length);

    if (documentsToEmbed.length > 0) {
        const embeddings = await embed(documentsToEmbed.map((doc) => doc.data));
        console.log("Embeddings computed:", embeddings.length);
        for (let i = 0; i < documentsToEmbed.length; i++) {
            const doc = documentsToEmbed[i];
            const embedding = embeddings[i];
            console.log("Setting embedding for", doc.hash);
            await cache.setEmbedding(doc.hash, embedding);
            processedDocuments.push({
                ...doc,
                embedding,
            });
        }
    }

    return processedDocuments;
};

export const addToEmbedbase = async (
    supabase: SupabaseClient,
    documents: Document[],
    datasetName: string,
    userId: string | null = null
) => {
    console.log("Adding documents to Embedbase", documents.length);
    const processedDocs = await checkAndComputeEmbeddings(documents);
    console.log("Processed documents:", processedDocs.length);

    let q = supabase.from("datasets").select("id").eq("name", datasetName)
    if (userId) {
        q = q.eq("owner", userId)
    }
    console.log("Checking for existing dataset:", datasetName);
    const { data: existingDataset, error: existingDatasetError } = await q;
    if (existingDatasetError) {
        console.error("An error occurred:", existingDatasetError.message);
        throw existingDatasetError;
    }
    console.log("Existing dataset:", existingDataset);
    let datasetId = existingDataset?.[0]?.id;

    console.log("Existing dataset:", existingDataset);
    if (existingDataset.length === 0) {
        console.log("Creating dataset:", datasetName);
        const { data, error } = await supabase.from("datasets").insert(
            {
                "name": datasetName,
                "owner": userId
            }
        ).select("id");
        if (error || !data) {
            console.error("An error occurred:", error.message || "No data returned");
            throw error;
        }
        datasetId = data[0].id;
    }
    const hashes = processedDocs.map((doc) => doc.hash);
    const { data: existingDocs, error } = await supabase
        .from("documents")
        .select("id, hash")
        .eq("user_id", userId)
        .eq("dataset_id", datasetName)
        .in("hash", hashes);

    if (error) {
        console.error("An error occurred:", error.message);
        throw error;
    }

    const newDocuments = processedDocs.filter(
        (doc) => !existingDocs?.some((existingDoc) => existingDoc.hash === doc.hash)
    );

    if (newDocuments.length > 0) {
        // add dataset_id and user_id to each doc
        newDocuments.forEach((doc) => {
            // @ts-ignore
            doc.dataset_id = datasetName;
            // @ts-ignore
            doc.user_id = userId;
            // @ts-ignore
            doc.dataset_final_id = datasetId;
        });
        console.log("New documents:", newDocuments);
        const { error } = await supabase.from("documents").insert(newDocuments);

        if (error) {
            console.error("An error occurred:", error.message);
            throw error;
        }
    }

    return processedDocs;
};

