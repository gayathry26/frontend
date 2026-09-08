import fs from 'fs';
import path from 'path';

export interface ParsedMarkdownSection {
  sectionTitle: string;
  level: number;
  content: string;
  codeBlocks: string[];
}

export function loadDefaultReadme(): { success: boolean; content?: string; filepath?: string; error?: string } {
  try {
    const rootDir = process.cwd();
    const defaultPath = path.join(rootDir, 'project-docs', 'README.md');

    if (fs.existsSync(defaultPath)) {
      const content = fs.readFileSync(defaultPath, 'utf-8');
      return { success: true, content, filepath: 'project-docs/README.md' };
    }

    // Fallback check for root README.md
    const rootReadmePath = path.join(rootDir, 'README.md');
    if (fs.existsSync(rootReadmePath)) {
      const content = fs.readFileSync(rootReadmePath, 'utf-8');
      return { success: true, content, filepath: 'README.md' };
    }

    return { success: false, error: 'No default project README.md found in /project-docs/' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load default README.md' };
  }
}

export function validateReadme(readmeText: string): { isValid: boolean; error?: string } {
  if (!readmeText || !readmeText.trim()) {
    return { isValid: false, error: 'Your README appears to be empty.' };
  }

  const trimmed = readmeText.trim();
  if (trimmed.length < 50) {
    return { isValid: false, error: 'Your README does not contain enough project information for a detailed interview.' };
  }

  return { isValid: true };
}

export function parseMarkdown(readmeText: string): ParsedMarkdownSection[] {
  const lines = readmeText.split('\n');
  const sections: ParsedMarkdownSection[] = [];

  let currentTitle = 'Project Overview';
  let currentLevel = 1;
  let currentContent: string[] = [];
  let currentCodeBlocks: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        currentCodeBlocks.push(codeBuffer.join('\n'));
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      currentContent.push(line);
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      currentContent.push(line);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentContent.length > 0 || currentCodeBlocks.length > 0) {
        sections.push({
          sectionTitle: currentTitle,
          level: currentLevel,
          content: currentContent.join('\n').trim(),
          codeBlocks: [...currentCodeBlocks],
        });
      }

      currentLevel = headingMatch[1].length;
      currentTitle = headingMatch[2].replace(/[*`]/g, '').trim();
      currentContent = [line];
      currentCodeBlocks = [];
      continue;
    }

    currentContent.push(line);
  }

  if (currentContent.length > 0 || currentCodeBlocks.length > 0) {
    sections.push({
      sectionTitle: currentTitle,
      level: currentLevel,
      content: currentContent.join('\n').trim(),
      codeBlocks: currentCodeBlocks,
    });
  }

  return sections.filter(s => s.content.trim().length > 0);
}
