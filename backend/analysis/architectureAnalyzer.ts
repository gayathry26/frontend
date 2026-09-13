/**
 * Architecture Pattern & Flow Analyzer
 * Identifies architectural paradigms and maps end-to-end request pipelines.
 */

import { IngestedRepository } from '../github/repositoryFetcher';
import { DetectedTechnologyStack } from './technologyDetector';
import { DiscoveredApiEndpoint } from './apiAnalyzer';
import { DiscoveredDatabaseModel } from './databaseAnalyzer';

export interface ArchitectureProfile {
  pattern: string; // e.g. "Full-Stack React + Node.js (App Router Architecture)"
  flowDiagram: string[]; // Sequential request pipeline steps
  componentLayers: {
    presentation: string[];
    routing: string[];
    businessLogic: string[];
    dataAccess: string[];
  };
  scalabilityBottlenecks: string[];
  securityHighlights: string[];
}

export function analyzeArchitecture(
  repo: IngestedRepository,
  tech: DetectedTechnologyStack,
  apis: DiscoveredApiEndpoint[],
  models: DiscoveredDatabaseModel[]
): ArchitectureProfile {
  const allPaths = repo.allFilePaths.map((p) => p.toLowerCase());
  const hasAppRouter = allPaths.some((p) => p.includes('app/api') || p.includes('app/page'));
  const hasPagesRouter = allPaths.some((p) => p.includes('pages/api') || p.includes('pages/index'));
  const hasControllers = allPaths.some((p) => p.includes('controller'));
  const hasServices = allPaths.some((p) => p.includes('service'));

  // 1. Determine Pattern
  let pattern = 'Layered Web Application Architecture';
  if (tech.frontendFrameworks.includes('Next.js')) {
    pattern = hasAppRouter
      ? 'Next.js App Router (Server-Side Rendering & Route Handlers)'
      : 'Next.js Pages Router (Hybrid SSG/SSR Architecture)';
  } else if (tech.backendFrameworks.includes('Spring Boot')) {
    pattern = 'Spring Boot 3-Tier Enterprise Architecture (Controller → Service → Repository → JPA Entity)';
  } else if (tech.backendFrameworks.includes('FastAPI')) {
    pattern = 'FastAPI Asynchronous Microservice (Pydantic Schemas → Async Endpoints → SQLAlchemy ORM)';
  } else if (tech.backendFrameworks.includes('Django')) {
    pattern = 'Django Model-View-Template (MVT) Architecture';
  } else if (tech.backendFrameworks.includes('Express.js') && tech.frontendFrameworks.includes('React')) {
    pattern = 'Decoupled Client-Server MERN Architecture';
  }

  // 2. Build Sequential Flow Diagram
  const flow: string[] = [];

  // Step 1: Presentation / Client
  if (tech.frontendFrameworks.length > 0) {
    flow.push(`Client UI (${tech.frontendFrameworks[0]} UI Components & State)`);
  } else {
    flow.push('HTTP Client / API Consumer');
  }

  // Step 2: Ingress / Routing
  if (apis.length > 0) {
    flow.push(`API Router (${apis[0].method} ${apis[0].path})`);
  } else {
    flow.push('API Routing Layer & Middleware Guards');
  }

  // Step 3: Auth & Security Verification
  if (tech.authentication.length > 0) {
    flow.push(`Auth Verification (${tech.authentication[0]})`);
  }

  // Step 4: Business Logic & Controllers
  if (hasServices) {
    flow.push('Domain Service Layer (Validation & Business Rules)');
  } else if (hasControllers) {
    flow.push('Controller Handler Layer');
  } else {
    flow.push('Backend Execution Logic');
  }

  // Step 5: Data Access / Storage
  if (tech.ormOrQueryBuilders.length > 0 && tech.databases.length > 0) {
    const modelSample = models[0]?.name ? `${models[0].name} Entity` : 'Data Model';
    flow.push(`${tech.ormOrQueryBuilders[0]} (${modelSample}) → ${tech.databases[0]}`);
  } else if (tech.databases.length > 0) {
    flow.push(`Database Persistence (${tech.databases[0]})`);
  } else {
    flow.push('Data Storage & Cache');
  }

  // 3. Component Layers
  const presentation = repo.allFilePaths.filter((p) =>
    p.includes('component') || p.includes('page') || p.includes('view') || p.endsWith('.tsx') || p.endsWith('.jsx')
  ).slice(0, 6);

  const routing = apis.map((a) => `${a.method} ${a.path} (${a.filePath})`).slice(0, 6);

  const businessLogic = repo.allFilePaths.filter((p) =>
    p.includes('service') || p.includes('controller') || p.includes('handler') || p.includes('usecase')
  ).slice(0, 6);

  const dataAccess = models.map((m) => `${m.name} (${m.filePath})`).slice(0, 6);

  // 4. Bottlenecks & Security Highlights
  const bottlenecks = [
    tech.databases.includes('MongoDB')
      ? 'MongoDB unindexed collection scans on high concurrency'
      : 'Relational database connection exhaustion under spike loads',
    tech.backendFrameworks.includes('Node.js') || tech.backendFrameworks.includes('Express.js')
      ? 'Single-threaded Node.js event-loop blocking from heavy synchronous computations'
      : 'Asynchronous worker pool saturation and memory pressure',
    'Network latency cascading without distributed caching (e.g. Redis)',
  ];

  const security = [
    tech.authentication.length > 0
      ? `Stateless authentication using ${tech.authentication[0]}`
      : 'Input sanitization and parameter validation',
    'Secret isolation via environment variables and redaction filters',
    'CORS and HTTP security headers on API endpoints',
  ];

  return {
    pattern,
    flowDiagram: flow,
    componentLayers: {
      presentation,
      routing,
      businessLogic,
      dataAccess,
    },
    scalabilityBottlenecks: bottlenecks,
    securityHighlights: security,
  };
}
