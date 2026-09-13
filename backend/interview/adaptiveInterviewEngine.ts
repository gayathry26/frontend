/**
 * Adaptive Technical Interview Engine
 * Orchestrates dynamic questioning, difficulty ramping, follow-ups, and session state.
 */

import { ProjectKnowledgeRepresentation } from '../analysis/projectKnowledgeBuilder';
import { CodeChunk } from '../rag/chunker';
import { generateAdaptiveQuestion, GeneratedQuestion, QuestionCategory } from './questionGenerator';
import { evaluateAnswer, DetailedAnswerEvaluation } from '../evaluation/answerEvaluator';
import { calculateOwnershipConfidence, OwnershipConfidenceResult } from '../evaluation/confidenceAnalyzer';
import { retrieveProjectContext } from '../rag/retriever';
import { generateAssessmentReport, FinalKnowledgeAssessmentReport } from '../reports/assessmentReport';
import { getDb, isMongoConfigured } from '../config/mongodb';

export type InterviewMode = 'QUICK' | 'STANDARD' | 'DEEP_TECHNICAL';

export interface InterviewQARecord {
  question: GeneratedQuestion;
  candidateAnswer?: string;
  evaluation?: DetailedAnswerEvaluation;
  answeredAt?: string;
  isFollowUp?: boolean;
}

export interface AdaptiveInterviewSession {
  sessionId: string;
  projectId: string;
  projectName: string;
  repoUrl: string;
  mode: InterviewMode;
  maxQuestions: number;
  currentQuestionIndex: number;
  currentDifficulty: 1 | 2 | 3 | 4;
  projectKnowledge: ProjectKnowledgeRepresentation;
  chunks: CodeChunk[];
  records: InterviewQARecord[];
  status: 'IN_PROGRESS' | 'COMPLETED';
  contradictionsDetected: string[];
  ownershipConfidence?: OwnershipConfidenceResult;
  finalReport?: FinalKnowledgeAssessmentReport;
  createdAt: string;
  updatedAt: string;
}

// In-memory cache of active interview sessions
const sessionsMap = new Map<string, AdaptiveInterviewSession>();

export async function createInterviewSession(params: {
  projectId: string;
  projectKnowledge: ProjectKnowledgeRepresentation;
  chunks: CodeChunk[];
  mode?: InterviewMode;
}): Promise<AdaptiveInterviewSession> {
  const mode = params.mode || 'QUICK';
  const maxQuestions = mode === 'QUICK' ? 10 : mode === 'STANDARD' ? 20 : 25;

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Generate Question #1 (Level 1 Basic Project Understanding)
  const initialQ = await generateAdaptiveQuestion({
    projectKnowledge: params.projectKnowledge,
    chunks: params.chunks,
    questionNumber: 1,
    targetCategory: 'PROJECT_UNDERSTANDING',
    targetDifficulty: 1,
    previousQuestions: [],
  });

  const session: AdaptiveInterviewSession = {
    sessionId,
    projectId: params.projectId,
    projectName: params.projectKnowledge.project,
    repoUrl: params.projectKnowledge.url,
    mode,
    maxQuestions,
    currentQuestionIndex: 0,
    currentDifficulty: 1,
    projectKnowledge: params.projectKnowledge,
    chunks: params.chunks,
    records: [
      {
        question: initialQ,
      },
    ],
    status: 'IN_PROGRESS',
    contradictionsDetected: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  sessionsMap.set(sessionId, session);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      await db.collection('adaptive_interview_sessions').insertOne({
        ...session,
        chunks: [], // exclude heavy raw chunks from MongoDB document
      } as any);
    } catch (e) {
      console.warn('Failed to persist session to MongoDB:', e);
    }
  }

  return session;
}

export async function submitAdaptiveAnswer(params: {
  sessionId: string;
  answer: string;
}): Promise<{
  session: AdaptiveInterviewSession;
  isCompleted: boolean;
  evaluation: DetailedAnswerEvaluation;
  nextQuestion?: GeneratedQuestion;
}> {
  const session = sessionsMap.get(params.sessionId);
  if (!session) {
    throw new Error('Interview session not found or expired.');
  }

  const currentRecord = session.records[session.currentQuestionIndex];
  if (!currentRecord) {
    throw new Error('No active question found for this session.');
  }

  currentRecord.candidateAnswer = params.answer.trim();
  currentRecord.answeredAt = new Date().toISOString();

  // Retrieve evidence context for this question
  const evidence = retrieveProjectContext(
    session.chunks,
    `${currentRecord.question.category} ${currentRecord.question.question}`,
    3
  );

  // Evaluate Answer
  const evaluation = await evaluateAnswer({
    question: currentRecord.question,
    candidateAnswer: params.answer,
    projectKnowledge: session.projectKnowledge,
    evidenceContext: evidence.contextSnippet,
  });

  currentRecord.evaluation = evaluation;

  // Track contradictions if detected
  if (evaluation.contradictionAlert?.hasContradiction) {
    session.contradictionsDetected.push(
      `${evaluation.contradictionAlert.topic}: ${evaluation.contradictionAlert.candidateClaim} vs ${evaluation.contradictionAlert.actualRepositoryFact}`
    );
  }

  // Adaptive Difficulty Adjustment
  // Strong answer (>75) -> increase difficulty
  // Weak answer (<50) -> decrease difficulty
  if (evaluation.overallScore >= 75 && session.currentDifficulty < 4) {
    session.currentDifficulty = (session.currentDifficulty + 1) as any;
  } else if (evaluation.overallScore < 50 && session.currentDifficulty > 1) {
    session.currentDifficulty = (session.currentDifficulty - 1) as any;
  }

  const isCompleted = session.records.length >= session.maxQuestions;

  let nextQuestion: GeneratedQuestion | undefined;

  if (!isCompleted) {
    // If answer needs immediate follow-up and was shallow, ask targeted follow-up
    if (evaluation.needsFollowUp && evaluation.followUpQuestion && !currentRecord.isFollowUp) {
      nextQuestion = {
        id: `q_fu_${Date.now()}_${session.records.length + 1}`,
        questionNumber: session.records.length + 1,
        question: evaluation.followUpQuestion,
        category: currentRecord.question.category,
        difficultyLevel: session.currentDifficulty,
        difficultyLabel: session.currentDifficulty === 1 ? 'Basic' : session.currentDifficulty === 2 ? 'Intermediate' : session.currentDifficulty === 3 ? 'Advanced' : 'Project Defense',
        evidenceFiles: currentRecord.question.evidenceFiles,
        reasonWhyAsked: `Follow-up probing missing implementation details from your previous answer.`,
        expectedKeyPoints: currentRecord.question.expectedKeyPoints,
      };

      session.records.push({
        question: nextQuestion,
        isFollowUp: true,
      });
      session.currentQuestionIndex += 1;
    } else {
      // Normal progression to next adaptive question
      const prevQList = session.records.map((r) => r.question.question);
      nextQuestion = await generateAdaptiveQuestion({
        projectKnowledge: session.projectKnowledge,
        chunks: session.chunks,
        questionNumber: session.records.length + 1,
        targetDifficulty: session.currentDifficulty,
        previousQuestions: prevQList,
      });

      session.records.push({
        question: nextQuestion,
      });
      session.currentQuestionIndex += 1;
    }
  } else {
    // Session is completed! Finalize evaluation & report
    session.status = 'COMPLETED';
    const allEvaluations = session.records.map((r) => r.evaluation).filter(Boolean) as DetailedAnswerEvaluation[];
    session.ownershipConfidence = calculateOwnershipConfidence(allEvaluations);
    session.finalReport = generateAssessmentReport(session);
  }

  session.updatedAt = new Date().toISOString();
  sessionsMap.set(session.sessionId, session);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      await db.collection('adaptive_interview_sessions').updateOne(
        { sessionId: session.sessionId },
        { $set: { ...session, chunks: [] } },
        { upsert: true }
      );
    } catch {}
  }

  return {
    session,
    isCompleted,
    evaluation,
    nextQuestion,
  };
}

export function getSessionById(sessionId: string): AdaptiveInterviewSession | null {
  return sessionsMap.get(sessionId) || null;
}
