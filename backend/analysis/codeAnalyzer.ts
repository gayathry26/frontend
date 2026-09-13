/**
 * Source Code Analyzer
 * Extracts important functions, classes, routes, models, and code blocks for Code Defense questions.
 */

import { FetchedFile } from '../github/repositoryFetcher';

export interface CodeDefenseSnippet {
  id: string;
  filePath: string;
  name: string;
  type: 'FUNCTION' | 'CLASS' | 'MIDDLEWARE' | 'ROUTE_HANDLER' | 'SCHEMA_MODEL';
  startLine: number;
  endLine: number;
  codeSnippet: string;
  language: string;
  purpose: string;
}

export function extractCodeSnippets(files: FetchedFile[]): CodeDefenseSnippet[] {
  const snippets: CodeDefenseSnippet[] = [];

  for (const file of files) {
    // Only analyze code files (skip markdown, lockfiles, json manifests)
    if (file.category === 'DOCS' || file.category === 'MANIFEST' || file.path.endsWith('.json')) {
      continue;
    }

    const lines = file.content.split('\n');
    const ext = file.path.split('.').pop()?.toLowerCase() || '';
    const lang = ext === 'py' ? 'python' : ext === 'java' ? 'java' : ext === 'go' ? 'go' : ext === 'rs' ? 'rust' : 'typescript';

    // 1. Detect JavaScript/TypeScript functions and exported blocks
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect export function or async function or router handler
        const fnMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/);
        const constMatch = line.match(/(?:export\s+)?const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/);
        const routeMatch = line.match(/(?:export\s+async\s+function|router\.(?:get|post|put|delete|patch))\s*(?:([a-zA-Z0-9_$]+)|\(['"]([^'"]+)['"])/);

        if (fnMatch || constMatch || routeMatch) {
          const fnName = fnMatch?.[1] || constMatch?.[1] || routeMatch?.[1] || routeMatch?.[2] || 'handler';
          if (['use', 'get', 'set'].includes(fnName) && fnName.length < 4) continue;

          // Extract up to 25 lines of function body
          const snippetLines = lines.slice(i, Math.min(lines.length, i + 25));
          snippets.push({
            id: `snippet_${snippets.length + 1}`,
            filePath: file.path,
            name: fnName,
            type: file.category === 'AUTH' ? 'MIDDLEWARE' : file.category === 'ROUTE' ? 'ROUTE_HANDLER' : 'FUNCTION',
            startLine: i + 1,
            endLine: i + snippetLines.length,
            codeSnippet: snippetLines.join('\n'),
            language: lang,
            purpose: `Implements ${fnName} in ${file.path}`,
          });

          if (snippets.length >= 10) break;
        }
      }
    }

    // 2. Detect Python functions & classes
    if (ext === 'py') {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const defMatch = line.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/);
        const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)/);

        if (defMatch || classMatch) {
          const name = defMatch?.[1] || classMatch?.[1] || 'method';
          if (name.startsWith('__') && name !== '__init__') continue;

          const snippetLines = lines.slice(i, Math.min(lines.length, i + 25));
          snippets.push({
            id: `snippet_${snippets.length + 1}`,
            filePath: file.path,
            name,
            type: classMatch ? 'CLASS' : 'FUNCTION',
            startLine: i + 1,
            endLine: i + snippetLines.length,
            codeSnippet: snippetLines.join('\n'),
            language: 'python',
            purpose: `Defines ${name} in ${file.path}`,
          });

          if (snippets.length >= 10) break;
        }
      }
    }

    // 3. Detect Java classes and methods
    if (ext === 'java') {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const methodMatch = line.match(/(?:public|protected|private)\s+(?:static\s+)?[a-zA-Z0-9_<>,\[\]]+\s+([a-zA-Z0-9_]+)\s*\(/);
        const classMatch = line.match(/public\s+class\s+([a-zA-Z0-9_]+)/);

        if (methodMatch || classMatch) {
          const name = methodMatch?.[1] || classMatch?.[1] || 'method';
          const snippetLines = lines.slice(i, Math.min(lines.length, i + 25));
          snippets.push({
            id: `snippet_${snippets.length + 1}`,
            filePath: file.path,
            name,
            type: classMatch ? 'CLASS' : 'FUNCTION',
            startLine: i + 1,
            endLine: i + snippetLines.length,
            codeSnippet: snippetLines.join('\n'),
            language: 'java',
            purpose: `Implements ${name} in ${file.path}`,
          });

          if (snippets.length >= 10) break;
        }
      }
    }
  }

  return snippets;
}
