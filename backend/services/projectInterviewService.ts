import { loadDefaultReadme, validateReadme, parseMarkdown } from './readmeService';
import { chunkDocument, DocumentChunk } from './documentService';
import { generateEmbedding, generateEmbeddings, generateQueryEmbedding } from './embeddingService';
import { addDocuments, searchSimilar, deleteProjectDocuments, clearIndex, VectorChunkRecord } from './vectorStoreService';
import { analyzeProject as analyzeProjectDocs, extractProjectOverview, sanitizeSecrets, ProjectProfile, ProjectClaim, KnowledgeNode, StructuredProjectOverview } from './projectAnalysisService';
import { generateQuestion, analyzeAnswer, generateFinalReport, RAGInterviewSession, RAGInterviewQuestion, AnswerEvaluation } from './interviewService';
import { getDb, isMongoConfigured } from '../config/mongodb';

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

// Pipeline Function: Fully ingests raw README text through Markdown Parsing -> Chunking -> Embedding -> Vector Indexing -> Project Analysis
export async function ingestProjectDocumentation(
  readmeContent: string,
  projectId = `proj_${Date.now()}`
): Promise<{
  projectId: string;
  profile: ProjectProfile;
  claims: ProjectClaim[];
  knowledgeNodes: KnowledgeNode[];
  chunksCount: number;
  topics: string[];
  readmeContent: string;
}> {
  const val = validateReadme(readmeContent);
  if (!val.isValid) {
    throw new Error(val.error || 'Invalid README documentation');
  }

  const sections = parseMarkdown(readmeContent);
  const chunks = chunkDocument(sections, projectId);

  // Generate vector embeddings for every chunk
  const chunkTexts = chunks.map(c => `${c.section}\n${c.text}`);
  const embeddings = await generateEmbeddings(chunkTexts);

  // Index in Vector Store
  await addDocuments(chunks, embeddings);

  // Extract Profile & Claims
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

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const col = db.collection('projects');
      await col.updateOne({ projectId }, { $set: projectRecord }, { upsert: true });
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

// Get Ingested User Projects List (Dynamic, no hardcoded cards!)
export async function getUserProjects(userId = 'default_student'): Promise<any[]> {
  const projectMap = (global as any)._userProjectsMap || new Map();
  const list: any[] = Array.from(projectMap.values());

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const col = db.collection('projects');
      const docs = await col.find({}).toArray();
      if (docs.length > 0) {
        return docs.map(d => {
          const { _id, ...rest } = d as any;
          return rest;
        });
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

export async function addUserProject(projectData: any, userId = 'default_student'): Promise<any> {
  const text = projectData.readmeText || `# ${projectData.name}\n${projectData.description}`;
  return ingestProjectDocumentation(text, `proj_${Date.now()}`);
}

export async function startInterviewSession(params: {
  userId?: string;
  projectId: string;
  mode?: any;
}): Promise<RAGInterviewSession> {
  const projects = await getUserProjects(params.userId || 'default_student');
  const proj = projects.find(p => p.projectId === params.projectId) || projects[0];

  if (!proj) {
    throw new Error('No indexed project found. Please upload or connect a README.md first.');
  }

  const mode = params.mode || 'FULL';
  const initialQ = await generateQuestion(proj.projectId, 'Project Architecture Overview', mode, [], proj.claims || []);

  const session: RAGInterviewSession = {
    sessionId: `session_${Date.now()}`,
    projectId: proj.projectId,
    projectName: proj.name || proj.profile?.name || 'Project Defense',
    readmeContent: proj.readmeContent || '',
    mode,
    profile: proj.profile || {
      name: proj.name,
      projectType: 'Full Stack Web Application',
      techStack: ['React', 'Node.js', 'Express', 'MongoDB'],
      architecture: 'Client-Server Architecture',
      architectureFlow: ['React', 'REST API', 'Node.js Express', 'MongoDB'],
      keyFeatures: ['Service Ticket Management', 'RBAC Auth'],
      aiIdentifiedContributions: ['Backend REST API', 'Database Schema'],
      notSpecifiedFields: [],
    },
    claims: proj.claims || [],
    questions: [initialQ],
    currentQuestionIndex: 0,
    status: 'in_progress',
    knowledgeMap: {
      Architecture: 'Medium',
      Database: 'Medium',
      Authentication: 'Medium',
      ApiDesign: 'Medium',
      Scalability: 'Weak',
      PersonalContribution: 'Strong',
    },
    contradictions: [],
    weakAreas: [],
    strongAreas: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const memoryMap = (global as any)._ragSessionsMap || new Map();
  memoryMap.set(session.sessionId, session);
  (global as any)._ragSessionsMap = memoryMap;

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const col = db.collection('interview_sessions');
      await col.insertOne(session as any);
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

  if (!session && isMongoConfigured()) {
    try {
      const db = await getDb();
      const col = db.collection<RAGInterviewSession>('interview_sessions');
      const doc = await col.findOne({ sessionId: params.sessionId });
      if (doc) {
        const { _id, ...rest } = doc as any;
        session = rest as RAGInterviewSession;
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

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const col = db.collection('interview_sessions');
      await col.updateOne({ sessionId: session.sessionId }, { $set: session });
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

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const col = db.collection<RAGInterviewSession>('interview_sessions');
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      if (docs.length > 0) {
        return docs.map(d => {
          const { _id, ...rest } = d as any;
          return rest as RAGInterviewSession;
        });
      }
    } catch {}
  }

  return list;
}

export const finalizeInterviewEvaluation = generateFinalReport;

export async function retryQuestionEvaluation(sessionId: string, questionId: string, newAnswer: string): Promise<any> {
  return submitAnswerAndGetNext({ sessionId, answer: newAnswer });
}

