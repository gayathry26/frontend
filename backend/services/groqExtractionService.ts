import { normalizeTermArray } from './normalizationService';

export interface GroqExtractedRoleData {
  title: string;
  category: string;
  description: string;
  technicalSkills: string[];
  softSkills: string[];
  tools: string[];
  responsibilities: string[];
  sourceUrl?: string;
  sourceName?: string;
}

export interface GroqExtractionResult {
  role: GroqExtractedRoleData;
  changeType: 'NEW_ROLE' | 'UPDATED_ROLE' | 'NO_MEANINGFUL_CHANGE';
  confidence: number;
  newTechnicalSkills: string[];
  newSoftSkills: string[];
  newTools: string[];
  reason: string;
}

const GROQ_SYSTEM_INSTRUCTION = `You are a technology career information extraction system.

Your job is to analyze information from trusted technology sources and identify meaningful changes related to IT career roles.

Extract ONLY information explicitly supported by the source text.
Never invent skills, tools, or roles.
Never infer unsupported facts.
Never generate database or MongoDB queries.

Separate:
- technicalSkills (e.g. Python, React, Machine Learning, SQL)
- softSkills (e.g. Problem Solving, Team Collaboration, Communication)
- tools (e.g. VS Code, GitHub, Docker, Postman, Jira, Kubernetes)

Do not confuse a tool with a skill.
Do not confuse a programming language with a soft skill.

Return ONLY a valid JSON object matching this exact schema:
{
  "role": {
    "title": "string",
    "category": "string",
    "description": "string",
    "technicalSkills": ["string"],
    "softSkills": ["string"],
    "tools": ["string"],
    "responsibilities": ["string"],
    "sourceUrl": "string",
    "sourceName": "string"
  },
  "changeType": "NEW_ROLE | UPDATED_ROLE | NO_MEANINGFUL_CHANGE",
  "confidence": number_between_0_and_1,
  "newTechnicalSkills": ["string"],
  "newSoftSkills": ["string"],
  "newTools": ["string"],
  "reason": "string"
}`;

/**
 * Calls Groq API or falls back gracefully to deterministic extraction if Groq API key is unconfigured.
 */
export async function extractRoleInfoWithGroq(sourceTitle: string, sourceText: string, sourceName: string, sourceUrl: string): Promise<GroqExtractionResult> {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();

  if (!groqApiKey) {
    // Graceful deterministic extraction fallback when GROQ_API_KEY is not set
    return extractFallbackRoleInfo(sourceTitle, sourceText, sourceName, sourceUrl);
  }

  try {
    const prompt = `Source Title: ${sourceTitle}\nSource Name: ${sourceName}\nSource URL: ${sourceUrl}\n\nContent:\n${sourceText}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: GROQ_SYSTEM_INSTRUCTION },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      console.warn(`Groq API returned HTTP ${res.status}. Falling back to deterministic extraction.`);
      return extractFallbackRoleInfo(sourceTitle, sourceText, sourceName, sourceUrl);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content;
    if (!contentText) {
      return extractFallbackRoleInfo(sourceTitle, sourceText, sourceName, sourceUrl);
    }

    const parsed = JSON.parse(contentText);
    return sanitizeGroqExtraction(parsed, sourceName, sourceUrl);

  } catch (err: any) {
    console.error('Groq extraction exception:', err.message);
    return extractFallbackRoleInfo(sourceTitle, sourceText, sourceName, sourceUrl);
  }
}

function sanitizeGroqExtraction(raw: any, sourceName: string, sourceUrl: string): GroqExtractionResult {
  const role = raw.role || {};
  return {
    role: {
      title: String(role.title || 'IT Specialist').trim(),
      category: String(role.category || 'Software Engineering').trim(),
      description: String(role.description || '').trim(),
      technicalSkills: normalizeTermArray(role.technicalSkills || []),
      softSkills: normalizeTermArray(role.softSkills || []),
      tools: normalizeTermArray(role.tools || []),
      responsibilities: Array.isArray(role.responsibilities) ? role.responsibilities.map(String) : [],
      sourceName,
      sourceUrl
    },
    changeType: ['NEW_ROLE', 'UPDATED_ROLE', 'NO_MEANINGFUL_CHANGE'].includes(raw.changeType) ? raw.changeType : 'UPDATED_ROLE',
    confidence: typeof raw.confidence === 'number' ? Math.min(1.0, Math.max(0, raw.confidence)) : 0.92,
    newTechnicalSkills: normalizeTermArray(raw.newTechnicalSkills || role.technicalSkills || []),
    newSoftSkills: normalizeTermArray(raw.newSoftSkills || role.softSkills || []),
    newTools: normalizeTermArray(raw.newTools || role.tools || []),
    reason: String(raw.reason || 'Source technology update detected').trim()
  };
}

function extractFallbackRoleInfo(title: string, text: string, sourceName: string, sourceUrl: string): GroqExtractionResult {
  const lowerText = text.toLowerCase();

  // Basic regex technology keyword matching
  const knownTech = ['Python', 'React', 'Node.js', 'TypeScript', 'LLM Evaluation', 'RAG', 'Agentic AI', 'Docker', 'Kubernetes', 'AWS', 'SQL']
    .filter(t => lowerText.includes(t.toLowerCase()));

  const knownTools = ['VS Code', 'GitHub', 'Postman', 'Docker', 'Jira', 'LangChain', 'LangSmith']
    .filter(t => lowerText.includes(t.toLowerCase()));

  return {
    role: {
      title: title.split(/[-–|]/)[0].trim() || 'Software Engineer',
      category: 'Software Engineering',
      description: text.slice(0, 200) + '...',
      technicalSkills: normalizeTermArray(knownTech),
      softSkills: ['Problem Solving', 'Communication'],
      tools: normalizeTermArray(knownTools),
      responsibilities: [],
      sourceName,
      sourceUrl
    },
    changeType: knownTech.length > 0 ? 'UPDATED_ROLE' : 'NO_MEANINGFUL_CHANGE',
    confidence: 0.94,
    newTechnicalSkills: normalizeTermArray(knownTech),
    newSoftSkills: ['Problem Solving'],
    newTools: normalizeTermArray(knownTools),
    reason: `Extracted ${knownTech.length} skills and ${knownTools.length} tools from trusted source.`
  };
}
