/**
 * GitHub Repository File Filter & Security Sanitizer
 * Automatically ignores noise/binary files and prioritizes architecture-critical files.
 */

// File extensions and directory paths that must be ignored
export const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.github',
  '.svn',
  '.next',
  'dist',
  'build',
  'out',
  'target',
  'bin',
  'obj',
  '.idea',
  '.vscode',
  'coverage',
  '.nyc_output',
  'venv',
  '.venv',
  'env',
  '__pycache__',
  '.pytest_cache',
  'vendor',
  '.gradle',
  '.turbo',
  'tmp',
  'temp',
  'logs',
]);

export const IGNORED_EXTENSIONS = new Set([
  // Binaries and archives
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff',
  '.mp4', '.mov', '.avi', '.mp3', '.wav', '.pdf', '.zip', '.tar', '.gz', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.class', '.jar', '.war', '.ear',
  '.pyc', '.pyo', '.pyd', '.woff', '.woff2', '.ttf', '.eot',
  // Lockfiles and large generated files
  '.lock', '.lockb',
]);

export const IGNORED_FILENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
  'Cargo.lock',
  'poetry.lock',
  'composer.lock',
  'Gemfile.lock',
  '.DS_Store',
  'Thumbs.db',
]);

export interface CategorizedFile {
  path: string;
  category: 'MANIFEST' | 'CONFIG' | 'AUTH' | 'ROUTE' | 'CONTROLLER' | 'SERVICE' | 'MODEL' | 'COMPONENT' | 'UTIL' | 'DOCS' | 'OTHER';
  importance: number; // 1 (highest) to 5
}

/**
 * Determines if a file should be analyzed
 */
export function isAnalyzableFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1];

  // Check if inside ignored directories
  for (const part of parts.slice(0, -1)) {
    if (IGNORED_DIRECTORIES.has(part)) {
      return false;
    }
  }

  // Check ignored filenames
  if (IGNORED_FILENAMES.has(fileName)) {
    return false;
  }

  // Check extensions
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = fileName.substring(dotIndex);
    if (IGNORED_EXTENSIONS.has(ext)) {
      return false;
    }
  }

  // Skip hidden files except essential configs (.env.example)
  if (fileName.startsWith('.') && fileName !== '.env.example' && fileName !== '.env.template') {
    return false;
  }

  return true;
}

/**
 * Classifies a file into functional categories for project architecture mapping
 */
export function categorizeFile(filePath: string): CategorizedFile {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const fileName = normalized.split('/').pop() || '';

  // 1. Manifests & Dependencies
  if (
    fileName === 'package.json' ||
    fileName === 'requirements.txt' ||
    fileName === 'pyproject.toml' ||
    fileName === 'pom.xml' ||
    fileName === 'build.gradle' ||
    fileName === 'go.mod' ||
    fileName === 'cargo.toml' ||
    fileName === 'composer.json' ||
    fileName === 'gemfile' ||
    fileName === 'pubspec.yaml'
  ) {
    return { path: filePath, category: 'MANIFEST', importance: 1 };
  }

  // 2. Documentation
  if (fileName.startsWith('readme') || fileName.includes('architecture') || fileName.includes('api-doc')) {
    return { path: filePath, category: 'DOCS', importance: 1 };
  }

  // 3. Configuration & Infrastructure
  if (
    fileName.includes('dockerfile') ||
    fileName.includes('docker-compose') ||
    fileName === '.env.example' ||
    fileName.includes('tsconfig') ||
    fileName.includes('vite.config') ||
    fileName.includes('next.config') ||
    fileName.includes('application.properties') ||
    fileName.includes('application.yml') ||
    fileName.includes('settings.py')
  ) {
    return { path: filePath, category: 'CONFIG', importance: 2 };
  }

  // 4. Authentication & Security
  if (
    normalized.includes('auth') ||
    normalized.includes('passport') ||
    normalized.includes('jwt') ||
    normalized.includes('session') ||
    normalized.includes('security') ||
    normalized.includes('guard')
  ) {
    return { path: filePath, category: 'AUTH', importance: 1 };
  }

  // 5. Database & Models / Schemas
  if (
    normalized.includes('model') ||
    normalized.includes('schema') ||
    normalized.includes('entity') ||
    normalized.includes('entities') ||
    normalized.includes('prisma') ||
    normalized.includes('migration') ||
    normalized.includes('db')
  ) {
    return { path: filePath, category: 'MODEL', importance: 2 };
  }

  // 6. Routes & APIs
  if (
    normalized.includes('route') ||
    normalized.includes('api') ||
    normalized.includes('endpoint') ||
    normalized.includes('urls.py')
  ) {
    return { path: filePath, category: 'ROUTE', importance: 2 };
  }

  // 7. Controllers
  if (normalized.includes('controller') || normalized.includes('handler')) {
    return { path: filePath, category: 'CONTROLLER', importance: 2 };
  }

  // 8. Services & Business Logic
  if (
    normalized.includes('service') ||
    normalized.includes('usecase') ||
    normalized.includes('repository') ||
    normalized.includes('logic') ||
    normalized.includes('manager')
  ) {
    return { path: filePath, category: 'SERVICE', importance: 2 };
  }

  // 9. Components & UI
  if (
    normalized.includes('component') ||
    normalized.includes('view') ||
    normalized.includes('page') ||
    normalized.includes('screen') ||
    normalized.includes('widget')
  ) {
    return { path: filePath, category: 'COMPONENT', importance: 3 };
  }

  // 10. Utilities & Middleware
  if (normalized.includes('util') || normalized.includes('helper') || normalized.includes('middleware')) {
    return { path: filePath, category: 'UTIL', importance: 3 };
  }

  return { path: filePath, category: 'OTHER', importance: 4 };
}

/**
 * Scrub API keys, tokens, passwords, private keys and secrets from source code
 * Ensures repositories with secrets are never sent to external LLMs or exposed in UI.
 */
export function sanitizeSecrets(text: string): string {
  if (!text) return '';
  return text
    // OpenAI, Google, AWS, GitHub tokens
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/AIza[a-zA-Z0-9_-]{20,}/g, '[REDACTED_GOOGLE_KEY]')
    .replace(/ghp_[a-zA-Z0-9]{20,}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/gho_[a-zA-Z0-9]{20,}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/github_pat_[a-zA-Z0-9_]{30,}/g, '[REDACTED_GITHUB_PAT]')
    .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
    // Private RSA/EC keys
    .replace(/-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[^]+?-----END[ A-Z0-9_-]+PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    // Database connection strings containing passwords
    .replace(/mongodb(?:\+srv)?:\/\/[^:\s]+:[^@\s]+@[^\s"']+/gi, 'mongodb://[REDACTED_CREDENTIALS]@[HOST]/[DB]')
    .replace(/postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@[^\s"']+/gi, 'postgresql://[REDACTED_CREDENTIALS]@[HOST]/[DB]')
    .replace(/mysql:\/\/[^:\s]+:[^@\s]+@[^\s"']+/gi, 'mysql://[REDACTED_CREDENTIALS]@[HOST]/[DB]')
    // Key/Secret assignment regex
    .replace(/(?:api[_-]?key|secret|password|token|bearer|private[_-]?key)\s*[:=]\s*["']?([a-zA-Z0-9_.~!@#$%^&*+-]{12,})["']?/gi, '$1: "[REDACTED_SECRET]"');
}
