
import { DocumentChunk } from './documentService';

export interface StructuredProjectOverview {
  project_name: string;
  one_line_summary: string;
  overview: string;
  tech_stack: {
    frontend: string[];
    backend: string[];
    database: string[];
    ai_ml: string[];
    deployment_infra: string[];
    other_tools: string[];
  };
  apis_and_keys_used: Array<{ name: string; purpose: string }>;
  architecture_highlights: string[];
  notable_features: string[];
  potential_interview_focus_areas: string[];
}

export interface ProjectProfile {
  name: string;
  projectType: string;
  techStack: string[];
  architecture: string;
  architectureFlow: string[];
  keyFeatures: string[];
  aiIdentifiedContributions: string[];
  notSpecifiedFields: string[];
  structuredOverview?: StructuredProjectOverview;
}

export interface ProjectClaim {
  id: string;
  claim: string;
  category: string;
  sourceSection: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  category: 'FRONTEND' | 'BACKEND' | 'DATABASE' | 'AUTHENTICATION' | 'API' | 'SECURITY' | 'ARCHITECTURE' | 'SCALABILITY' | 'DEPLOYMENT';
  section: string;
  snippet: string;
}

/**
 * Security helper: Scrub potential secret keys/tokens before sending to external services/models.
 */
export function sanitizeSecrets(text: string): string {
  if (!text) return '';
  return text
    .replace(/sk-[a-zA-Z0-9_-]{16,}/g, '[REDACTED_SECRET_KEY]')
    .replace(/AIza[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/ghp_[a-zA-Z0-9]{20,}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(?:key|secret|password|token)\s*[:=]\s*["']?([a-zA-Z0-9_.~-]{16,})["']?/gi, '$1: "[REDACTED_VALUE]"');
}

async function callGeminiAI(prompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      }
    }
  } catch (err) {
    console.warn('Gemini call failed in projectAnalysisService:', err);
  }
  return null;
}

/**
 * Extracts a clean, structured project summary from retrieved RAG chunks.
 */
export async function extractProjectOverview(retrievedChunks: string): Promise<StructuredProjectOverview | null> {
  const sanitized = sanitizeSecrets(retrievedChunks);

  const prompt = `You are a technical analyst helping generate an interview based on a software project's README.

You will be given retrieved chunks of a README (via RAG). Using ONLY the information present in these chunks, produce a structured JSON summary of the project. Do not invent details that aren't supported by the text. If something isn't mentioned, use "Not specified" or an empty array.

Rules:
- Overview must be 3-5 sentences, written for someone non-technical to understand what the project does and why it matters.
- Tech stack must be categorized (frontend, backend, database, ai_ml, deployment_infra, other tools).
- For APIs/keys, list only the NAME and PURPOSE of any API, service, or key mentioned (e.g. "GEMINI_API_KEY - used for generating interview questions"). NEVER output actual key values, even if one appears in the text by mistake.
- "notable_features" should be 3-6 short bullet points of what makes this project distinct.
- "potential_interview_focus_areas" should be 4-8 topics/questions a technical interviewer could probe, based on architecture choices visible in the README (e.g. "Why choose a vector DB over keyword search?", "How is chunking size decided?").
- Output valid JSON only. No markdown, no commentary, no code fences.

Output schema:
{
  "project_name": "string",
  "one_line_summary": "string",
  "overview": "string (3-5 sentences)",
  "tech_stack": {
    "frontend": ["string"],
    "backend": ["string"],
    "database": ["string"],
    "ai_ml": ["string"],
    "deployment_infra": ["string"],
    "other_tools": ["string"]
  },
  "apis_and_keys_used": [
    { "name": "string", "purpose": "string" }
  ],
  "architecture_highlights": ["string"],
  "notable_features": ["string"],
  "potential_interview_focus_areas": ["string"]
}

README context (retrieved chunks):
"""
${sanitized.slice(0, 5000)}
"""`;

  return await callGeminiAI(prompt);
}

export async function analyzeProject(
  chunks: DocumentChunk[],
  fullReadmeText: string
): Promise<{
  profile: ProjectProfile;
  claims: ProjectClaim[];
  knowledgeNodes: KnowledgeNode[];
  topics: string[];
}> {
  const prompt = `
Analyze the following project README documentation chunks to extract a structured Project Knowledge Base.
README CONTENT:
"""
${fullReadmeText.slice(0, 4500)}
"""

Tasks:
1. Extract Project Name (if not specified, name appropriately), Project Type, Tech Stack list, Architecture description and step-by-step flow, Key Features list, AI Identified Contributions, and list any missing/unspecified information under "notSpecifiedFields".
2. Extract explicit testable claims made in the documentation (e.g. "Implemented JWT authentication", "Designed database schema").
3. Generate 6-9 Knowledge Map nodes corresponding to sections in the README (e.g. Frontend, Backend, Database, Authentication, API, Security, Architecture, Scalability).

Return strict JSON:
{
  "name": "string",
  "projectType": "string",
  "techStack": ["string"],
  "architecture": "string",
  "architectureFlow": ["string"],
  "keyFeatures": ["string"],
  "aiIdentifiedContributions": ["string"],
  "notSpecifiedFields": ["string"],
  "claims": [
    { "claim": "string", "category": "string", "sourceSection": "string" }
  ],
  "knowledgeNodes": [
    { "id": "string", "label": "string", "category": "FRONTEND" | "BACKEND" | "DATABASE" | "AUTHENTICATION" | "API" | "SECURITY" | "ARCHITECTURE" | "SCALABILITY" | "DEPLOYMENT", "section": "string", "snippet": "string" }
  ]
}
`;



  const retrievedText = chunks.map(c => `## ${c.section}\n${c.text}`).join('\n\n');
  const [aiRes, structuredOverview] = await Promise.all([
    callGeminiAI(prompt),
    extractProjectOverview(retrievedText)
  ]);

  if (aiRes && aiRes.name) {
    const claims: ProjectClaim[] = (aiRes.claims || []).map((c: any, i: number) => ({
      id: `claim-${i + 1}`,
      claim: c.claim,
      category: c.category || 'TECHNICAL CLAIMS',
      sourceSection: c.sourceSection || 'README.md',
    }));

    const knowledgeNodes: KnowledgeNode[] = (aiRes.knowledgeNodes || []).map((n: any, i: number) => ({
      id: n.id || `node-${i + 1}`,
      label: n.label || n.category || 'Architecture',
      category: n.category || 'ARCHITECTURE',
      section: n.section || 'README.md',
      snippet: n.snippet || 'Extracted from project documentation.',
    }));

    const profile: ProjectProfile = {
      name: structuredOverview?.project_name || aiRes.name || 'Campus Service Management System',
      projectType: aiRes.projectType || 'Full Stack Web Application',
      techStack: aiRes.techStack || ['React', 'Node.js', 'Express', 'MongoDB'],
      architecture: aiRes.architecture || 'Client-Server REST Architecture',
      architectureFlow: aiRes.architectureFlow || ['React Frontend', 'REST API Gateway', 'Node.js Express', 'MongoDB Atlas'],
      keyFeatures: structuredOverview?.notable_features || aiRes.keyFeatures || ['Service Ticket Management', 'RBAC Authentication', 'Admin Dashboard'],
      aiIdentifiedContributions: aiRes.aiIdentifiedContributions || ['Backend REST API', 'Database Schema', 'Authentication'],
      notSpecifiedFields: aiRes.notSpecifiedFields || [],
      structuredOverview: structuredOverview || undefined,
    };

    const topics = Array.from(new Set(knowledgeNodes.map(n => n.category)));

    return { profile, claims, knowledgeNodes, topics };
  }
  const lower = fullReadmeText.toLowerCase();

  const techStack: string[] = [];
  ['React', 'Next.js', 'Vue', 'Node.js', 'Express', 'Python', 'FastAPI', 'Django', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'JWT', 'Docker', 'TypeScript', 'Tailwind']
    .forEach(t => {
      if (lower.includes(t.toLowerCase())) techStack.push(t);
    });

  const claims: ProjectClaim[] = [];
  if (lower.includes('jwt') || lower.includes('auth')) {
    claims.push({ id: 'claim-1', claim: 'Implemented JWT authentication and RBAC security.', category: 'AUTHENTICATION', sourceSection: 'Authentication' });
  }
  if (lower.includes('mongo') || lower.includes('postgres') || lower.includes('database')) {
    claims.push({ id: 'claim-2', claim: 'Designed optimized database schema and compound indexes.', category: 'DATABASE', sourceSection: 'Database' });
  }
  if (lower.includes('rest') || lower.includes('api')) {
    claims.push({ id: 'claim-3', claim: 'Built secure RESTful APIs for client-server communication.', category: 'API', sourceSection: 'API Architecture' });
  }

  const knowledgeNodes: KnowledgeNode[] = chunks.slice(0, 8).map((c, i) => {
    let cat: KnowledgeNode['category'] = 'ARCHITECTURE';
    const sLower = c.section.toLowerCase();
    if (sLower.includes('front')) cat = 'FRONTEND';
    else if (sLower.includes('back')) cat = 'BACKEND';
    else if (sLower.includes('data')) cat = 'DATABASE';
    else if (sLower.includes('auth')) cat = 'AUTHENTICATION';
    else if (sLower.includes('api')) cat = 'API';
    else if (sLower.includes('sec')) cat = 'SECURITY';
    else if (sLower.includes('scale')) cat = 'SCALABILITY';

    return {
      id: `node-${i + 1}`,
      label: c.section,
      category: cat,
      section: c.section,
      snippet: c.text.slice(0, 180) + '...',
    };
  });

  const notSpecified: string[] = [];
  if (!lower.includes('deploy') && !lower.includes('docker') && !lower.includes('vercel')) {
    notSpecified.push('Deployment architecture not specified in README.');
  }

  const firstLine = fullReadmeText.split('\n')[0].replace(/^[#\s]+/, '').trim();
  const name = firstLine.length > 3 && firstLine.length < 60 ? firstLine : 'Campus Service Management System';

  const profile: ProjectProfile = {
    name,
    projectType: 'Full Stack Web Application',
    techStack: techStack.length > 0 ? techStack : ['React', 'Node.js', 'Express', 'MongoDB'],
    architecture: 'Decoupled Client-Server REST Architecture',
    architectureFlow: ['React SPA', 'REST API Gateway', 'Node.js Express Backend', 'MongoDB Atlas'],
    keyFeatures: ['Service Ticket Management', 'RBAC Authentication', 'Admin Dashboard'],
    aiIdentifiedContributions: ['Backend REST API', 'Database Schema', 'Authentication'],
    notSpecifiedFields: notSpecified,
  };

  const topics = Array.from(new Set(knowledgeNodes.map(n => n.category)));

  return { profile, claims, knowledgeNodes, topics };
}
