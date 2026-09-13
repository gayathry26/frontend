import { query, isPostgresConfigured } from '../config/postgres';
import { DocumentChunk } from './documentService';

export interface VectorChunkRecord extends DocumentChunk {
  embedding: number[];
  createdAt: string;
}

// In-memory store fallback
const memoryVectorStore = new Map<string, VectorChunkRecord[]>();

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

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

  // Store in PostgreSQL if configured
  if (isPostgresConfigured()) {
    try {
      await query(`DELETE FROM document_chunks WHERE project_id = $1;`, [projectId]);
      for (const rec of records) {
        await query(`
          INSERT INTO document_chunks (chunk_id, project_id, file_path, content, embedding, created_at)
          VALUES ($1, $2, $3, $4, $5, $6);
        `, [
          rec.chunkId,
          rec.projectId,
          rec.source || null,
          rec.text,
          JSON.stringify(rec.embedding),
          rec.createdAt
        ]);
      }
    } catch (err: any) {
      console.warn('Failed to insert vector chunks into PostgreSQL, using memory store:', err.message);
    }
  }
}

export async function searchSimilar(
  queryEmbedding: number[],
  projectId: string,
  topK = 4
): Promise<VectorChunkRecord[]> {
  let chunksToSearch: VectorChunkRecord[] = [];

  // Try fetching from PostgreSQL first
  if (isPostgresConfigured()) {
    try {
      const res = await query(`SELECT * FROM document_chunks WHERE project_id = $1;`, [projectId]);
      if (res.rows.length > 0) {
        chunksToSearch = res.rows.map(r => ({
          chunkId: r.chunk_id || `chunk_${r.id}`,
          projectId: r.project_id,
          section: 'Documentation',
          source: r.file_path || 'README.md',
          text: r.content || '',
          metadata: {
            charCount: (r.content || '').length,
            wordCount: (r.content || '').split(/\s+/).length,
            hasCode: false,
            level: 1
          },
          embedding: typeof r.embedding === 'string' ? JSON.parse(r.embedding) : (r.embedding || []),
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
        }));
      } else {
        chunksToSearch = memoryVectorStore.get(projectId) || [];
      }
    } catch (err) {
      chunksToSearch = memoryVectorStore.get(projectId) || [];
    }
  } else {
    chunksToSearch = memoryVectorStore.get(projectId) || [];
  }

  if (chunksToSearch.length === 0) {
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
  if (isPostgresConfigured()) {
    try {
      await query(`DELETE FROM document_chunks WHERE project_id = $1;`, [projectId]);
    } catch {}
  }
}

export async function clearIndex(): Promise<void> {
  memoryVectorStore.clear();
  if (isPostgresConfigured()) {
    try {
      await query(`DELETE FROM document_chunks;`);
    } catch {}
  }
}
