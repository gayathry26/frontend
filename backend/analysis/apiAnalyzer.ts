/**
 * API Route Analyzer
 * Identifies REST and GraphQL endpoints, HTTP verbs, paths, and middleware guards.
 */

import { FetchedFile } from '../github/repositoryFetcher';

export interface DiscoveredApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'USE';
  path: string;
  filePath: string;
  handlerName: string;
  hasAuthGuard: boolean;
}

export function extractApiEndpoints(files: FetchedFile[]): DiscoveredApiEndpoint[] {
  const endpoints: DiscoveredApiEndpoint[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');
    const lowerPath = file.path.toLowerCase();

    // 1. Next.js App Router (src/app/api/.../route.ts)
    if (lowerPath.includes('app/api') && lowerPath.endsWith('route.ts') || lowerPath.endsWith('route.js')) {
      const matchPath = file.path.match(/app\/api\/(.+)\/route\.[jt]s/i);
      const apiPath = matchPath ? `/api/${matchPath[1]}` : file.path;

      for (const line of lines) {
        const methodMatch = line.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/i);
        if (methodMatch) {
          const method = methodMatch[1].toUpperCase() as any;
          endpoints.push({
            method,
            path: apiPath,
            filePath: file.path,
            handlerName: methodMatch[1],
            hasAuthGuard: file.content.includes('auth') || file.content.includes('jwt') || file.content.includes('token'),
          });
        }
      }
    }

    // 2. Express.js routes (router.get('/path', ...))
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const expressMatch = line.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i);
      if (expressMatch) {
        endpoints.push({
          method: expressMatch[1].toUpperCase() as any,
          path: expressMatch[2],
          filePath: file.path,
          handlerName: `express_${expressMatch[1]}`,
          hasAuthGuard: line.includes('auth') || line.includes('verify') || line.includes('protect'),
        });
      }

      // 3. FastAPI endpoints (@router.post("/process") or @app.get("/users"))
      const fastApiMatch = line.match(/@(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/i);
      if (fastApiMatch) {
        const nextLine = lines[i + 1] || '';
        const fnMatch = nextLine.match(/def\s+([a-zA-Z0-9_]+)/);
        endpoints.push({
          method: fastApiMatch[1].toUpperCase() as any,
          path: fastApiMatch[2],
          filePath: file.path,
          handlerName: fnMatch ? fnMatch[1] : 'fastapi_handler',
          hasAuthGuard: line.includes('Depends') || nextLine.includes('Depends'),
        });
      }

      // 4. Spring Boot endpoints (@GetMapping("/path"), @PostMapping("/path"))
      const springMatch = line.match(/@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?['"]([^'"]+)['"]/i);
      if (springMatch) {
        const nextLine = lines[i + 1] || '';
        const fnMatch = nextLine.match(/public\s+[a-zA-Z0-9_<>,\[\]]+\s+([a-zA-Z0-9_]+)/);
        endpoints.push({
          method: springMatch[1].toUpperCase() as any,
          path: springMatch[2],
          filePath: file.path,
          handlerName: fnMatch ? fnMatch[1] : 'spring_controller',
          hasAuthGuard: file.content.includes('PreAuthorize') || file.content.includes('Security'),
        });
      }
    }
  }

  return endpoints;
}
