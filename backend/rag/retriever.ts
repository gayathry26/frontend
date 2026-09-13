/**
 * Repository Retriever
 * Retrieves relevant project chunks grounded in repository files for question generation and answer verification.
 */

import { CodeChunk } from './chunker';

export interface RetrievedEvidence {
  chunks: CodeChunk[];
  sourceFiles: string[];
  contextSnippet: string;
}

export function retrieveProjectContext(chunks: CodeChunk[], query: string, topK = 4): RetrievedEvidence {
  if (!chunks || chunks.length === 0) {
    return { chunks: [], sourceFiles: [], contextSnippet: '' };
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  // Score chunks by keyword frequency and relevance
  const scored = chunks.map((chunk) => {
    let score = 0;
    const lowerText = chunk.text.toLowerCase();
    const lowerPath = chunk.filePath.toLowerCase();

    for (const rawTerm of queryTerms) {
      const term = rawTerm.replace(/[^a-z0-9_-]/g, '');
      if (term.length < 2) continue;
      if (lowerPath.includes(term)) score += 8;
      if (chunk.category.toLowerCase().includes(term)) score += 5;
      const count = lowerText.split(term).length - 1;
      score += Math.min(count, 5);
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const bestChunks = scored.slice(0, topK).map((s) => s.chunk);

  const sourceFiles = Array.from(new Set(bestChunks.map((c) => c.filePath)));
  const contextSnippet = bestChunks
    .map((c) => `[File: ${c.filePath} | Category: ${c.category}]\n${c.text}`)
    .join('\n\n---\n\n');

  return {
    chunks: bestChunks,
    sourceFiles,
    contextSnippet,
  };
}
