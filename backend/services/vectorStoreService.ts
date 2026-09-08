import { getDb, isMongoConfigured } from '../config/mongodb';
import { DocumentChunk } from './documentService';

export interface VectorChunkRecord extends DocumentChunk {
  embedding: number[];
  createdAt: string;
}

// In-memory store fallback
const memoryVectorStore = new Map<string, VectorChunkRecord[]>();

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

  // Handle dimensional mismatch if fallback vs API embeddings mix
  const minDim = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < minDim; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function addDocuments(chunks: DocumentChunk[], embeddings: number[][]): Promise<void> {
  const records: VectorChunkRecord[] = chunks.map((c, i) => ({
    ...c,
    embedding: embeddings[i] || [],
    createdAt: new Date().toISOString(),
  }));

  const projectId = chunks[0]?.projectId || 'default_project';

  // Store in memory
  memoryVectorStore.set(projectId, records);

  // Store in MongoDB if configured
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const collection = db.collection<VectorChunkRecord>('document_chunks');
      await collection.deleteMany({ projectId });
      if (records.length > 0) {
        await collection.insertMany(records as any);
      }
    } catch (err) {
      console.warn('Failed to insert vector chunks into MongoDB, using memory store:', err);
    }
  }
}

export async function searchSimilar(
  queryEmbedding: number[],
  projectId: string,
  topK = 4
): Promise<VectorChunkRecord[]> {
  let chunksToSearch: VectorChunkRecord[] = [];

  // Try fetching from MongoDB first
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const collection = db.collection<VectorChunkRecord>('document_chunks');
      chunksToSearch = await collection.find({ projectId }).toArray() as any;
    } catch (err) {
      chunksToSearch = memoryVectorStore.get(projectId) || [];
    }
  } else {
    chunksToSearch = memoryVectorStore.get(projectId) || [];
  }

  if (chunksToSearch.length === 0) {
    // Return any stored chunks across projects if specific project has no chunks
    for (const list of Array.from(memoryVectorStore.values())) {
      chunksToSearch.push(...list);
    }
  }

  const scored = chunksToSearch.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(item => item.chunk);
}

export async function deleteProjectDocuments(projectId: string): Promise<void> {
  memoryVectorStore.delete(projectId);
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const collection = db.collection('document_chunks');
      await collection.deleteMany({ projectId });
    } catch {}
  }
}

export async function clearIndex(): Promise<void> {
  memoryVectorStore.clear();
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const collection = db.collection('document_chunks');
      await collection.deleteMany({});
    } catch {}
  }
}
