import { ParsedMarkdownSection } from './readmeService';

export interface DocumentChunk {
  chunkId: string;
  projectId: string;
  section: string;
  source: string;
  text: string;
  metadata: {
    charCount: number;
    wordCount: number;
    hasCode: boolean;
    level: number;
  };
}

export function chunkDocument(
  sections: ParsedMarkdownSection[],
  projectId: string,
  source = 'README.md',
  maxChunkSize = 800
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkCount = 1;

  for (const sec of sections) {
    const text = sec.content.trim();
    if (!text) continue;

    // If section content fits within maxChunkSize, keep as single semantic section chunk
    if (text.length <= maxChunkSize) {
      chunks.push({
        chunkId: `chunk_${projectId}_${chunkCount++}`,
        projectId,
        section: sec.sectionTitle,
        source,
        text,
        metadata: {
          charCount: text.length,
          wordCount: text.split(/\s+/).length,
          hasCode: sec.codeBlocks.length > 0,
          level: sec.level,
        },
      });
    } else {
      // Split large section by paragraphs or lines while preserving section header context
      const paragraphs = text.split(/\n\s*\n/);
      let buffer = `### ${sec.sectionTitle}\n`;

      for (const para of paragraphs) {
        if ((buffer + '\n' + para).length > maxChunkSize && buffer.length > 30) {
          chunks.push({
            chunkId: `chunk_${projectId}_${chunkCount++}`,
            projectId,
            section: sec.sectionTitle,
            source,
            text: buffer.trim(),
            metadata: {
              charCount: buffer.length,
              wordCount: buffer.split(/\s+/).length,
              hasCode: sec.codeBlocks.length > 0,
              level: sec.level,
            },
          });
          buffer = `### ${sec.sectionTitle} (Cont.)\n${para}`;
        } else {
          buffer += (buffer.endsWith('\n') ? '' : '\n\n') + para;
        }
      }

      if (buffer.trim().length > 0) {
        chunks.push({
          chunkId: `chunk_${projectId}_${chunkCount++}`,
          projectId,
          section: sec.sectionTitle,
          source,
          text: buffer.trim(),
          metadata: {
            charCount: buffer.length,
            wordCount: buffer.split(/\s+/).length,
            hasCode: sec.codeBlocks.length > 0,
            level: sec.level,
          },
        });
      }
    }
  }

  return chunks;
}
