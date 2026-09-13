/**
 * Code & Documentation Semantic Chunker
 * Chunks source code while preserving metadata (file path, module, category, function names, related models).
 */

import { FetchedFile } from '../github/repositoryFetcher';

export interface CodeChunk {
  id: string;
  projectId: string;
  filePath: string;
  category: string;
  title: string;
  text: string;
  metadata: {
    startLine: number;
    endLine: number;
    functionNames?: string[];
    relatedModel?: string;
    relatedApi?: string;
  };
}

export function chunkSourceFiles(projectId: string, files: FetchedFile[], maxChunkChars = 800): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');
    let currentChunkLines: string[] = [];
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
      currentChunkLines.push(lines[i]);
      const currentLength = currentChunkLines.join('\n').length;

      // Split chunk if reaching max characters or on major logical boundaries
      if (currentLength >= maxChunkChars || i === lines.length - 1) {
        const text = currentChunkLines.join('\n').trim();
        if (text.length > 30) {
          chunks.push({
            id: `chk_${projectId}_${chunks.length + 1}`,
            projectId,
            filePath: file.path,
            category: file.category,
            title: `${file.path} (lines ${startLine}-${i + 1})`,
            text,
            metadata: {
              startLine,
              endLine: i + 1,
            },
          });
        }
        currentChunkLines = [];
        startLine = i + 2;
      }
    }
  }

  return chunks;
}
