/**
 * Technology-Agnostic Adaptive Question Generator
 * Generates repository-grounded questions across 11 categories and 4 difficulty levels.
 */

import { ProjectKnowledgeRepresentation } from '../analysis/projectKnowledgeBuilder';
import { retrieveProjectContext } from '../rag/retriever';
import { CodeChunk } from '../rag/chunker';
import { LLMProvider } from '../llm/llmProvider';
import { CodeDefenseSnippet } from '../analysis/codeAnalyzer';

export type QuestionCategory =
  | 'PROJECT_UNDERSTANDING'
  | 'CODE_UNDERSTANDING'
  | 'ARCHITECTURE'
  | 'TECH_DECISION'
  | 'FEATURE_DEEP_DIVE'
  | 'API_UNDERSTANDING'
  | 'DATABASE_UNDERSTANDING'
  | 'AUTH_SECURITY'
  | 'DEBUGGING'
  | 'MODIFICATION'
  | 'CODE_DEFENSE';

export interface GeneratedQuestion {
  id: string;
  questionNumber: number;
  question: string;
  category: QuestionCategory;
  difficultyLevel: 1 | 2 | 3 | 4; // 1: Basic, 2: Intermediate, 3: Advanced, 4: Project Defense
  difficultyLabel: 'Basic' | 'Intermediate' | 'Advanced' | 'Project Defense';
  evidenceFiles: string[];
  reasonWhyAsked: string;
  codeSnippet?: {
    filePath: string;
    language: string;
    startLine: number;
    endLine: number;
    code: string;
  };
  expectedKeyPoints: string[];
}

export async function generateAdaptiveQuestion(params: {
  projectKnowledge: ProjectKnowledgeRepresentation;
  chunks: CodeChunk[];
  questionNumber: number;
  targetCategory?: QuestionCategory;
  targetDifficulty?: 1 | 2 | 3 | 4;
  previousQuestions: string[];
}): Promise<GeneratedQuestion> {
  const { projectKnowledge, chunks, questionNumber, previousQuestions } = params;

  // Determine difficulty level if not specified
  let difficultyLevel: 1 | 2 | 3 | 4 = params.targetDifficulty || (
    questionNumber <= 3 ? 1 : questionNumber <= 7 ? 2 : questionNumber <= 14 ? 3 : 4
  );

  const difficultyLabels: Record<number, 'Basic' | 'Intermediate' | 'Advanced' | 'Project Defense'> = {
    1: 'Basic',
    2: 'Intermediate',
    3: 'Advanced',
    4: 'Project Defense',
  };

  // Determine category cycle if not specified
  const categoryOrder: QuestionCategory[] = [
    'PROJECT_UNDERSTANDING',
    'ARCHITECTURE',
    'TECH_DECISION',
    'AUTH_SECURITY',
    'API_UNDERSTANDING',
    'DATABASE_UNDERSTANDING',
    'CODE_DEFENSE',
    'FEATURE_DEEP_DIVE',
    'DEBUGGING',
    'MODIFICATION',
    'CODE_UNDERSTANDING',
  ];

  const category = params.targetCategory || categoryOrder[(questionNumber - 1) % categoryOrder.length];

  // If category is CODE_DEFENSE and we have extracted code snippets, select one
  let defenseSnippet: CodeDefenseSnippet | undefined;
  if (category === 'CODE_DEFENSE' && projectKnowledge.codeDefenseSnippets.length > 0) {
    const idx = (questionNumber - 1) % projectKnowledge.codeDefenseSnippets.length;
    defenseSnippet = projectKnowledge.codeDefenseSnippets[idx];
  }

  // Retrieve evidence context from chunks
  const queryTerm = `${category} ${projectKnowledge.technologies.join(' ')} ${projectKnowledge.features.join(' ')}`;
  const retrieved = retrieveProjectContext(chunks, queryTerm, 3);
  const evidenceFiles = retrieved.sourceFiles.length > 0
    ? retrieved.sourceFiles
    : [projectKnowledge.importantFiles[0]?.path || 'src/main'];

  // Construct prompt for LLM
  const prompt = `You are a Senior Technical Lead interviewing a candidate on their specific GitHub repository.

PROJECT REPOSITORY CONTEXT:
Project Name: ${projectKnowledge.project}
Detected Tech Stack: ${projectKnowledge.technologies.join(', ')}
Primary Architecture: ${projectKnowledge.architecture.pattern}
Key Features: ${projectKnowledge.features.join(', ')}
Authentication: ${projectKnowledge.authentication}
API Endpoints: ${projectKnowledge.apis.map((a) => `${a.method} ${a.path}`).slice(0, 5).join(', ')}
Database Models: ${projectKnowledge.databaseModels.map((m) => `${m.name} (${m.fields.join(', ')})`).slice(0, 5).join(', ')}

CODE EVIDENCE CONTEXT:
"""
${retrieved.contextSnippet.slice(0, 3000)}
"""

${defenseSnippet ? `CODE DEFENSE SNIPPET TO SHOW CANDIDATE (from ${defenseSnippet.filePath}):\n\`\`\`${defenseSnippet.language}\n${defenseSnippet.codeSnippet}\n\`\`\`` : ''}

PREVIOUS QUESTIONS ASKED:
${previousQuestions.slice(-5).join('\n')}

INSTRUCTIONS:
Generate Question #${questionNumber} for Category "${category}" at Difficulty Level ${difficultyLevel} (${difficultyLabels[difficultyLevel]}).
RULES:
1. DO NOT ask generic questions like "What is React?" or "What is MongoDB?".
2. Assess how the candidate actually implemented the technology in THIS SPECIFIC PROJECT.
${category === 'CODE_DEFENSE' && defenseSnippet ? '3. Present the code snippet above and ask the candidate to explain its logic, why it was implemented this way, and how errors/edge-cases are handled.' : ''}
${category === 'ARCHITECTURE' ? '3. Ask the candidate to trace how a request moves through the system from the client to the database based on their actual project layers.' : ''}
${category === 'DEBUGGING' ? '3. Present a realistic production incident scenario involving their specific stack and ask what files/modules they would investigate first and why.' : ''}
${category === 'MODIFICATION' ? '3. Ask how they would extend or modify a specific feature (e.g. adding OAuth, caching, or rate limiting) and which files would change.' : ''}
${category === 'TECH_DECISION' ? '3. Ask why they chose their specific technology/database over alternatives for this specific application.' : ''}

Respond in valid JSON ONLY:
{
  "question": "string (the interview question)",
  "reasonWhyAsked": "string (transparent explanation for candidate: 'Why was this question asked?')",
  "expectedKeyPoints": ["key point 1", "key point 2", "key point 3"]
}`;

  const aiRes = await LLMProvider.completeJson<{
    question: string;
    reasonWhyAsked: string;
    expectedKeyPoints: string[];
  }>(prompt);

  if (aiRes && aiRes.question) {
    return {
      id: `q_${Date.now()}_${questionNumber}`,
      questionNumber,
      question: aiRes.question,
      category,
      difficultyLevel,
      difficultyLabel: difficultyLabels[difficultyLevel],
      evidenceFiles,
      reasonWhyAsked: aiRes.reasonWhyAsked || `Generated because ${evidenceFiles.join(', ')} implements ${category}.`,
      codeSnippet: defenseSnippet
        ? {
            filePath: defenseSnippet.filePath,
            language: defenseSnippet.language,
            startLine: defenseSnippet.startLine,
            endLine: defenseSnippet.endLine,
            code: defenseSnippet.codeSnippet,
          }
        : undefined,
      expectedKeyPoints: aiRes.expectedKeyPoints || [],
    };
  }

  // Fallback grounded question generators if LLM is offline
  return generateFallbackQuestion({
    projectKnowledge,
    category,
    difficultyLevel,
    difficultyLabels,
    evidenceFiles,
    defenseSnippet,
    questionNumber,
  });
}

function generateFallbackQuestion(params: {
  projectKnowledge: ProjectKnowledgeRepresentation;
  category: QuestionCategory;
  difficultyLevel: 1 | 2 | 3 | 4;
  difficultyLabels: Record<number, 'Basic' | 'Intermediate' | 'Advanced' | 'Project Defense'>;
  evidenceFiles: string[];
  defenseSnippet?: CodeDefenseSnippet;
  questionNumber: number;
}): GeneratedQuestion {
  const { projectKnowledge, category, difficultyLevel, difficultyLabels, evidenceFiles, defenseSnippet, questionNumber } = params;
  const tech = projectKnowledge.techStackDetailed;
  const firstApi = projectKnowledge.apis[0];
  const firstModel = projectKnowledge.databaseModels[0];

  let question = `Explain the overall architecture and main purpose of ${projectKnowledge.project}.`;
  let expectedKeyPoints = ['Primary user problem solved', 'Core technology choices', 'Data flow'];

  if (category === 'CODE_DEFENSE' && defenseSnippet) {
    question = `Examine this implementation from ${defenseSnippet.filePath} (lines ${defenseSnippet.startLine}-${defenseSnippet.endLine}): Explain what this code is doing line-by-line and describe why you chose this implementation strategy.`;
    expectedKeyPoints = ['Function purpose', 'Input validation', 'Error handling', 'Execution flow'];
  } else if (category === 'ARCHITECTURE') {
    question = `Explain the complete step-by-step request flow in your project when a client triggers an action, from the presentation layer through your ${tech.backendFrameworks[0] || 'backend'} service down to ${tech.databases[0] || 'the database'}.`;
    expectedKeyPoints = ['Client dispatch', 'API route handling', 'Business validation', 'Database persistence'];
  } else if (category === 'TECH_DECISION') {
    const db = tech.databases[0] || 'your selected database';
    question = `Why did you select ${db} for ${projectKnowledge.project} instead of an alternative database architecture? What specific data characteristics made it suitable?`;
    expectedKeyPoints = ['Data schema requirements', 'Query pattern fit', 'Scalability considerations'];
  } else if (category === 'AUTH_SECURITY') {
    question = `Your project implements ${projectKnowledge.authentication}. Explain where credentials and tokens are created, how they are transmitted with requests, and how protected routes validate them.`;
    expectedKeyPoints = ['Token generation', 'Header or cookie storage', 'Middleware validation logic'];
  } else if (category === 'API_UNDERSTANDING' && firstApi) {
    question = `Walk me through what happens when a client sends a ${firstApi.method} request to ${firstApi.path}. What parameters are required and how are errors returned?`;
    expectedKeyPoints = ['Input validation', 'Controller execution', 'HTTP status codes'];
  } else if (category === 'DATABASE_UNDERSTANDING' && firstModel) {
    question = `Explain how the ${firstModel.name} model is structured in ${firstModel.filePath}. Why did you choose these specific fields (${firstModel.fields.slice(0, 4).join(', ')}) and how is indexing handled?`;
    expectedKeyPoints = ['Schema fields justification', 'Index design', 'Data consistency'];
  } else if (category === 'DEBUGGING') {
    question = `Users report that requests to ${firstApi ? firstApi.path : 'the primary API'} occasionally fail with a timeout under high traffic. Which files or layers in your project would you inspect first and how would you resolve it?`;
    expectedKeyPoints = ['Log inspection', 'Database connection pooling', 'Error tracing'];
  } else if (category === 'MODIFICATION') {
    question = `If you had to add Google OAuth 2.0 social login or Redis distributed caching to this project, which specific files would you need to create or modify?`;
    expectedKeyPoints = ['Route additions', 'Auth configuration files', 'Environment variable handling'];
  }

  return {
    id: `q_fb_${Date.now()}_${questionNumber}`,
    questionNumber,
    question,
    category,
    difficultyLevel,
    difficultyLabel: difficultyLabels[difficultyLevel],
    evidenceFiles,
    reasonWhyAsked: `This question was generated because ${evidenceFiles.join(', ')} contains the actual ${category.toLowerCase()} implementation for this project.`,
    codeSnippet: defenseSnippet
      ? {
          filePath: defenseSnippet.filePath,
          language: defenseSnippet.language,
          startLine: defenseSnippet.startLine,
          endLine: defenseSnippet.endLine,
          code: defenseSnippet.codeSnippet,
        }
      : undefined,
    expectedKeyPoints,
  };
}
