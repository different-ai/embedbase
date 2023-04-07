// THis function returns the cosine similarity of two vectors
export const cosineSimilarity = (a: number[], b: number[]) => {
    const dotProduct = dot(a, b);
    const magnitudeA = magnitude(a);
    const magnitudeB = magnitude(b);
    return dotProduct / (magnitudeA * magnitudeB);
};
// This function returns the dot product of two vectors
const dot = (a: number[], b: number[]) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
};
// This function returns the magnitude of a vector
const magnitude = (a: number[]) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * a[i];
    }
    return Math.sqrt(sum);
};

interface Doc {
    data: string
    embedding: number[]
}

interface Neighbor {
    data: string
    score: number
}

// This function returns the k nearest neighbors of the embedding
// It uses cosine similarity to find the nearest neighbors
export const nearestNeighbors = (query: Doc, index: Doc[], k: number) => {
    const neighbors: Neighbor[] = [];
    for (const doc of index) {
        const score = cosineSimilarity(doc.embedding, query.embedding);
        neighbors.push({
            data: doc.data,
            score: score
        });
    }
    neighbors.sort((a, b) => b.score - a.score);
    return neighbors.slice(0, k);
}