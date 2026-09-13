import { loadDefaultReadme, validateReadme, parseMarkdown } from './readmeService';
import { chunkDocument, DocumentChunk } from './documentService';
import { generateEmbedding, generateEmbeddings, generateQueryEmbedding } from './embeddingService';
import { addDocuments, searchSimilar, deleteProjectDocuments, clearIndex, VectorChunkRecord } from './vectorStoreService';
import { analyzeProject as analyzeProjectDocs, extractProjectOverview, sanitizeSecrets, ProjectProfile, ProjectClaim, KnowledgeNode, StructuredProjectOverview } from './projectAnalysisService';
import { generateQuestion, analyzeAnswer, generateFinalReport, RAGInterviewSession, RAGInterviewQuestion, AnswerEvaluation } from './interviewService';
import { query, isPostgresConfigured } from '../config/postgres';

export {
  loadDefaultReadme,
  validateReadme,
  parseMarkdown,
  chunkDocument,
  generateEmbedding,
  generateEmbeddings,
  generateQueryEmbedding,
  addDocuments,
  searchSimilar,
  deleteProjectDocuments,
  clearIndex,
  analyzeProjectDocs,
  extractProjectOverview,
  sanitizeSecrets,
  generateQuestion,
  analyzeAnswer,
  generateFinalReport
};

export type {
  DocumentChunk,
  VectorChunkRecord,
  ProjectProfile,
  ProjectClaim,
  KnowledgeNode,
  StructuredProjectOverview,
  RAGInterviewSession,
  RAGInterviewQuestion,
  AnswerEvaluation
};

// Full Ingestion Pipeline
export async function ingestProjectDocumentation(
  readmeContent: string,
  projectId = 'default_project'
): Promise<any> {
  const sanitized = sanitizeSecrets(readmeContent);
  const validation = validateReadme(sanitized);

  if (!validation.isValid && validation.error) {
    console.warn(`README validation issues found for ${projectId}:`, validation.error);
  }

  // Chunking
  const sections = parseMarkdown(sanitized);
  const chunks: DocumentChunk[] = chunkDocument(sections, projectId);

  // Embeddings & Vector Storage
  const texts = chunks.map(c => `${c.section} \n ${c.text}`);
  const embeddings = await generateEmbeddings(texts);
  await addDocuments(chunks, embeddings);

  // Analysis & Profile Building
  const analysis = await analyzeProjectDocs(chunks, readmeContent);

  // Store Project Record in DB / memory
  const projectRecord = {
    projectId,
    name: analysis.profile.name,
    readmeContent,
    profile: analysis.profile,
    claims: analysis.claims,
    knowledgeNodes: analysis.knowledgeNodes,
    chunksCount: chunks.length,
    topics: analysis.topics,
    updatedAt: new Date().toISOString(),
  };

  const projectMap = (global as any)._userProjectsMap || new Map();
  projectMap.set(projectId, projectRecord);
  (global as any)._userProjectsMap = projectMap;

  if (isPostgresConfigured()) {
    try {
      await query(`
        INSERT INTO projects (
          project_id, name, readme_content, profile, claims,
          knowledge_nodes, chunks_count, topics, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (project_id) DO UPDATE SET
          name = EXCLUDED.name,
          readme_content = EXCLUDED.readme_content,
          profile = EXCLUDED.profile,
          claims = EXCLUDED.claims,
          knowledge_nodes = EXCLUDED.knowledge_nodes,
          chunks_count = EXCLUDED.chunks_count,
          topics = EXCLUDED.topics,
          updated_at = NOW();
      `, [
        projectId,
        analysis.profile.name,
        readmeContent,
        JSON.stringify(analysis.profile),
        JSON.stringify(analysis.claims),
        JSON.stringify(analysis.knowledgeNodes),
        chunks.length,
        JSON.stringify(analysis.topics)
      ]);
    } catch {}
  }

  return {
    projectId,
    profile: analysis.profile,
    claims: analysis.claims,
    knowledgeNodes: analysis.knowledgeNodes,
    chunksCount: chunks.length,
    topics: analysis.topics,
    readmeContent,
  };
}

// Ingest Default README from /project-docs/README.md
export async function ingestDefaultReadme(): Promise<any> {
  const loaded = loadDefaultReadme();
  if (!loaded.success || !loaded.content) {
    throw new Error(loaded.error || 'Failed to load default README.md');
  }
  return ingestProjectDocumentation(loaded.content, 'default_project_docs');
}

// Get Ingested User Projects List
export async function getUserProjects(userId = 'default_student'): Promise<any[]> {
  const projectMap = (global as any)._userProjectsMap || new Map();
  const list: any[] = Array.from(projectMap.values());

  if (isPostgresConfigured()) {
    try {
      const res = await query(`SELECT * FROM projects ORDER BY updated_at DESC;`);
      if (res.rows.length > 0) {
        return res.rows.map(d => ({
          projectId: d.project_id,
          name: d.name,
          readmeContent: d.readme_content,
          profile: typeof d.profile === 'string' ? JSON.parse(d.profile) : (d.profile || {}),
          claims: typeof d.claims === 'string' ? JSON.parse(d.claims) : (d.claims || []),
          knowledgeNodes: typeof d.knowledge_nodes === 'string' ? JSON.parse(d.knowledge_nodes) : (d.knowledge_nodes || []),
          chunksCount: d.chunks_count,
          topics: typeof d.topics === 'string' ? JSON.parse(d.topics) : (d.topics || []),
          updatedAt: d.updated_at ? new Date(d.updated_at).toISOString() : new Date().toISOString()
        }));
      }
    } catch {}
  }

  if (list.length === 0) {
    try {
      const def = await ingestDefaultReadme();
      return [def];
    } catch (e) {
      return [];
    }
  }

  return list;
}

// Add User Project
export async function addUserProject(projectData: any, userId = 'default_student'): Promise<any> {
  const readme = projectData.readmeContent || projectData.readme || '';
  const pid = projectData.projectId || projectData.id || `proj_${Date.now()}`;
  return ingestProjectDocumentation(readme, pid);
}

// Start New Interview Session
export async function startInterviewSession(params: {
  projectId: string;
  mode?: 'QUICK' | 'DETAILED';
  candidateName?: string;
}): Promise<RAGInterviewSession> {
  const mode: any = params.mode === 'DETAILED' ? 'FULL' : (params.mode || 'QUICK');
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Find project profile and claims
  const projectMap = (global as any)._userProjectsMap || new Map();
  let proj = projectMap.get(params.projectId);

  if (!proj && isPostgresConfigured()) {
    try {
      const res = await query(`SELECT * FROM projects WHERE project_id = $1 LIMIT 1;`, [params.projectId]);
      if (res.rows.length > 0) {
        const d = res.rows[0];
        proj = {
          projectId: d.project_id,
          name: d.name,
          readmeContent: d.readme_content,
          profile: typeof d.profile === 'string' ? JSON.parse(d.profile) : d.profile,
          claims: typeof d.claims === 'string' ? JSON.parse(d.claims) : d.claims,
          topics: typeof d.topics === 'string' ? JSON.parse(d.topics) : d.topics,
        };
      }
    } catch {}
  }

  const claims = proj?.claims || [
    {
      claimText: 'Implemented full-stack features with scalable database',
      sourceSection: 'Architecture',
      confidence: 0.9,
      tags: ['Architecture', 'Database'],
      verifiable: true,
    }
  ];

  const firstTopic = proj?.topics?.[0] || 'System Architecture';
  const initialQuestion = await generateQuestion(params.projectId, firstTopic, mode, [], claims);

  const session: RAGInterviewSession = {
    sessionId,
    projectId: params.projectId,
    projectName: proj?.name || 'Project System',
    readmeContent: proj?.readmeContent || '',
    mode,
    currentQuestionIndex: 0,
    questions: [initialQuestion],
    profile: proj?.profile || {
      name: proj?.name || 'Project System',
      tagline: '',
      description: '',
      targetAudience: '',
      techStack: [],
      architectureType: '',
      coreModules: [],
      keyFeatures: [],
      dependencies: [],
      assumedScale: '',
      complexityScore: 5,
    },
    weakAreas: [],
    strongAreas: [],
    status: 'in_progress',
    contradictions: [],
    knowledgeMap: {},
    claims,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const memoryMap = (global as any)._ragSessionsMap || new Map();
  memoryMap.set(session.sessionId, session);
  (global as any)._ragSessionsMap = memoryMap;

  if (isPostgresConfigured()) {
    try {
      await query(`
        INSERT INTO interview_sessions (session_id, data, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (session_id) DO UPDATE SET
          data = EXCLUDED.data,
          status = EXCLUDED.status,
          updated_at = NOW();
      `, [session.sessionId, JSON.stringify(session), session.status]);
    } catch {}
  }

  return session;
}

export async function submitAnswerAndGetNext(params: {
  sessionId: string;
  answer: string;
  answerMode?: string;
}): Promise<{ session: RAGInterviewSession; isCompleted: boolean; latestEvaluation?: AnswerEvaluation }> {
  const memoryMap = (global as any)._ragSessionsMap || new Map();
  let session: RAGInterviewSession | null = memoryMap.get(params.sessionId) || null;

  if (!session && isPostgresConfigured()) {
    try {
      const res = await query(`SELECT data FROM interview_sessions WHERE session_id = $1 LIMIT 1;`, [params.sessionId]);
      if (res.rows.length > 0) {
        session = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
      }
    } catch {}
  }

  if (!session) throw new Error('Session not found');

  const currentIdx = session.currentQuestionIndex;
  const currentQ = session.questions[currentIdx];

  if (!currentQ) throw new Error('Invalid question index');

  currentQ.studentAnswer = params.answer.trim();

  const prevQAs = session.questions
    .slice(0, currentIdx)
    .filter(q => q.studentAnswer)
    .map(q => ({ question: q.question, answer: q.studentAnswer || '' }));

  const analysisRes = await analyzeAnswer(
    session.projectId,
    currentQ,
    params.answer,
    prevQAs,
    session.claims
  );

  currentQ.evaluation = analysisRes.evaluation;
  if (analysisRes.consistencyAlert) {
    session.contradictions.push(analysisRes.consistencyAlert);
  }
  if (analysisRes.updatedKnowledgeMap) {
    session.knowledgeMap = {
      ...session.knowledgeMap,
      ...analysisRes.updatedKnowledgeMap,
    };
  }

  const maxQuestions = session.mode === 'QUICK' ? 5 : 8;
  const isCompleted = currentIdx + 1 >= maxQuestions;

  if (!isCompleted) {
    const nextTopic = currentQ.category || 'Architecture & Implementation';
    const nextQ = await generateQuestion(session.projectId, nextTopic, session.mode, session.questions, session.claims);
    session.questions.push(nextQ);
    session.currentQuestionIndex = currentIdx + 1;
  } else {
    session.status = 'completed';
  }

  session.updatedAt = new Date().toISOString();
  memoryMap.set(session.sessionId, session);
  (global as any)._ragSessionsMap = memoryMap;

  if (isPostgresConfigured()) {
    try {
      await query(`
        UPDATE interview_sessions
        SET data = $1, status = $2, updated_at = NOW()
        WHERE session_id = $3;
      `, [JSON.stringify(session), session.status, session.sessionId]);
    } catch {}
  }

  if (session.status === 'completed') {
    await generateFinalReport(session.sessionId);
  }

  const updatedSession = memoryMap.get(session.sessionId) || session;

  return {
    session: updatedSession,
    isCompleted: updatedSession.status === 'completed',
    latestEvaluation: currentQ.evaluation,
  };
}

export async function getInterviewHistory(userId = 'default_student'): Promise<RAGInterviewSession[]> {
  const memoryMap = (global as any)._ragSessionsMap || new Map();
  const list: RAGInterviewSession[] = Array.from(memoryMap.values());

  if (isPostgresConfigured()) {
    try {
      const res = await query(`SELECT data FROM interview_sessions ORDER BY created_at DESC;`);
      if (res.rows.length > 0) {
        return res.rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
      }
    } catch {}
  }

  return list;
}

export const finalizeInterviewEvaluation = generateFinalReport;

export async function retryQuestionEvaluation(sessionId: string, questionId: string, newAnswer: string): Promise<any> {
  return submitAnswerAndGetNext({ sessionId, answer: newAnswer });
}
