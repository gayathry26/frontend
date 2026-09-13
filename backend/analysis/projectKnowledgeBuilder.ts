/**
 * Project Knowledge Representation Builder
 * Synthesizes tech stack, architecture, APIs, models, code snippets, and knowledge graph.
 */

import { IngestedRepository } from '../github/repositoryFetcher';
import { detectTechnologies, DetectedTechnologyStack } from './technologyDetector';
import { analyzeArchitecture, ArchitectureProfile } from './architectureAnalyzer';
import { extractApiEndpoints, DiscoveredApiEndpoint } from './apiAnalyzer';
import { extractDatabaseModels, DiscoveredDatabaseModel } from './databaseAnalyzer';
import { extractCodeSnippets, CodeDefenseSnippet } from './codeAnalyzer';

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  category: 'FRONTEND' | 'ROUTE' | 'CONTROLLER' | 'SERVICE' | 'MODEL' | 'DATABASE' | 'AUTH';
  details: string;
}

export interface KnowledgeGraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface ProjectKnowledgeRepresentation {
  project: string;
  owner: string;
  url: string;
  description: string;
  technologies: string[];
  techStackDetailed: DetectedTechnologyStack;
  features: string[];
  architecture: ArchitectureProfile;
  authentication: string;
  apis: DiscoveredApiEndpoint[];
  databaseModels: DiscoveredDatabaseModel[];
  codeDefenseSnippets: CodeDefenseSnippet[];
  importantFiles: Array<{ path: string; category: string; description: string }>;
  dependencies: string[];
  relationships: Array<{ from: string; to: string; description: string }>;
  knowledgeGraph: {
    nodes: KnowledgeGraphNode[];
    links: KnowledgeGraphLink[];
  };
  totalFilesCount: number;
}

export function buildProjectKnowledge(repo: IngestedRepository): ProjectKnowledgeRepresentation {
  const tech = detectTechnologies(repo);
  const apis = extractApiEndpoints(repo.analyzedFiles);
  const models = extractDatabaseModels(repo.analyzedFiles);
  const snippets = extractCodeSnippets(repo.analyzedFiles);
  const architecture = analyzeArchitecture(repo, tech, apis, models);

  // 1. Detect Features from code and paths
  const features = new Set<string>();
  const allPaths = repo.allFilePaths.map((p) => p.toLowerCase());
  const allText = repo.analyzedFiles.map((f) => f.content.toLowerCase()).join('\n');

  if (tech.authentication.length > 0 || allText.includes('login') || allText.includes('signup')) {
    features.add('User Authentication & Authorization');
  }
  if (allText.includes('stripe') || allText.includes('checkout') || allText.includes('payment')) {
    features.add('Payment Processing & Checkout');
  }
  if (allText.includes('cart') || allText.includes('order')) {
    features.add('Order & Cart Management');
  }
  if (models.some((m) => m.name.toLowerCase().includes('user') || m.name.toLowerCase().includes('account'))) {
    features.add('Account & Profile Management');
  }
  if (allText.includes('search') || allText.includes('filter')) {
    features.add('Search & Query Filtering');
  }
  if (allPaths.some((p) => p.includes('dashboard') || p.includes('admin'))) {
    features.add('Analytics & Management Dashboard');
  }
  if (allText.includes('upload') || allText.includes('multer') || allText.includes('s3')) {
    features.add('File & Media Ingestion');
  }

  if (features.size === 0) {
    features.add('Core Business Logic Processing');
    features.add('REST Data Access & Persistence');
  }

  // 2. Identify Important Files
  const importantFiles = repo.analyzedFiles.map((f) => ({
    path: f.path,
    category: f.category,
    description: `${f.category} layer implementation (${Math.round(f.sizeBytes / 1024)} KB)`,
  }));

  // 3. Dependencies list from manifests
  const dependencies: string[] = [];
  const manifest = repo.analyzedFiles.find((f) => f.category === 'MANIFEST');
  if (manifest && manifest.path.endsWith('package.json')) {
    try {
      const parsed = JSON.parse(manifest.content);
      dependencies.push(...Object.keys(parsed.dependencies || {}));
    } catch {}
  } else if (manifest && manifest.path.includes('requirements.txt')) {
    const lines = manifest.content.split('\n');
    lines.forEach((l) => {
      const dep = l.split('==')[0].trim();
      if (dep && !dep.startsWith('#')) dependencies.push(dep);
    });
  }

  // 4. Construct Knowledge Graph & Trace Relationships
  const nodes: KnowledgeGraphNode[] = [];
  const links: KnowledgeGraphLink[] = [];
  const relationships: Array<{ from: string; to: string; description: string }> = [];

  // Frontend Node
  if (tech.frontendFrameworks.length > 0) {
    nodes.push({
      id: 'node_frontend',
      label: `${tech.frontendFrameworks[0]} UI`,
      category: 'FRONTEND',
      details: 'User interface state and presentation components',
    });
  }

  // API Node
  const firstApi = apis[0];
  const apiLabel = firstApi ? `${firstApi.method} ${firstApi.path}` : 'REST API Route';
  nodes.push({
    id: 'node_api',
    label: apiLabel,
    category: 'ROUTE',
    details: firstApi ? firstApi.filePath : 'HTTP request routing and validation',
  });

  if (tech.frontendFrameworks.length > 0) {
    links.push({ source: 'node_frontend', target: 'node_api', relation: 'Dispatches HTTP Request' });
    relationships.push({
      from: `${tech.frontendFrameworks[0]} UI`,
      to: apiLabel,
      description: 'Frontend component triggers network request with payload',
    });
  }

  // Auth Guard Node
  if (tech.authentication.length > 0) {
    nodes.push({
      id: 'node_auth',
      label: tech.authentication[0],
      category: 'AUTH',
      details: 'Token verification and RBAC middleware',
    });
    links.push({ source: 'node_api', target: 'node_auth', relation: 'Intercepts & Validates' });
    relationships.push({
      from: apiLabel,
      to: tech.authentication[0],
      description: 'Route middleware verifies token header and extracts session context',
    });
  }

  // Service / Logic Node
  nodes.push({
    id: 'node_service',
    label: tech.backendFrameworks[0] ? `${tech.backendFrameworks[0]} Service` : 'Business Logic Service',
    category: 'SERVICE',
    details: 'Data transformation, domain validation, external integrations',
  });
  links.push({ source: tech.authentication.length > 0 ? 'node_auth' : 'node_api', target: 'node_service', relation: 'Executes Handler' });

  // Database Model Node
  const firstModel = models[0];
  const modelLabel = firstModel ? `${firstModel.name} Model` : (tech.databases[0] ? `${tech.databases[0]} Schema` : 'Database Schema');
  nodes.push({
    id: 'node_model',
    label: modelLabel,
    category: 'MODEL',
    details: firstModel ? `${firstModel.filePath} (${firstModel.fields.join(', ')})` : 'Data structure definition',
  });
  links.push({ source: 'node_service', target: 'node_model', relation: 'Queries & Persists' });

  // Database Engine Node
  if (tech.databases.length > 0) {
    nodes.push({
      id: 'node_db',
      label: tech.databases[0],
      category: 'DATABASE',
      details: 'Data storage engine and index execution',
    });
    links.push({ source: 'node_model', target: 'node_db', relation: 'Stores Data' });
    relationships.push({
      from: modelLabel,
      to: tech.databases[0],
      description: 'ORM/driver translates model operations into database queries',
    });
  }

  return {
    project: repo.name,
    owner: repo.owner,
    url: repo.url,
    description: repo.metadata.description || 'Full-stack application analyzed by ITCareerHub',
    technologies: [
      ...tech.languages,
      ...tech.frontendFrameworks,
      ...tech.backendFrameworks,
      ...tech.databases,
      ...tech.authentication,
    ],
    techStackDetailed: tech,
    features: Array.from(features),
    architecture,
    authentication: tech.authentication[0] || 'Standard Session / Custom Auth',
    apis,
    databaseModels: models,
    codeDefenseSnippets: snippets,
    importantFiles,
    dependencies: dependencies.slice(0, 20),
    relationships,
    knowledgeGraph: { nodes, links },
    totalFilesCount: repo.allFilePaths.length,
  };
}
