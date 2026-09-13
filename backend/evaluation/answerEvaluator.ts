/**
 * Comprehensive Answer Evaluator
 * Evaluates candidate responses against both general technical principles and repository source truth.
 */

import { ProjectKnowledgeRepresentation } from '../analysis/projectKnowledgeBuilder';
import { GeneratedQuestion } from '../interview/questionGenerator';
import { detectContradictions, ContradictionAlert } from './contradictionDetector';
import { LLMProvider } from '../llm/llmProvider';

export interface DetailedAnswerEvaluation {
  overallScore: number; // 0-100
  technicalCorrectness: number; // 0-100
  projectUnderstanding: number; // 0-100
  implementationUnderstanding: number; // 0-100
  reasoning: number; // 0-100
  codeMatch: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  feedback: string;
  isShallow: boolean;
  needsFollowUp: boolean;
  followUpQuestion?: string;
  contradictionAlert?: ContradictionAlert;
}

export async function evaluateAnswer(params: {
  question: GeneratedQuestion;
  candidateAnswer: string;
  projectKnowledge: ProjectKnowledgeRepresentation;
  evidenceContext: string;
}): Promise<DetailedAnswerEvaluation> {
  const { question, candidateAnswer, projectKnowledge, evidenceContext } = params;

  // 1. Run Contradiction Detector first
  const contradiction = detectContradictions(candidateAnswer, projectKnowledge);

  // 2. Check for shallow answer
  const words = candidateAnswer.trim().split(/\s+/);
  const isShallow = words.length < 15;

  const prompt = `You are a Principal Software Engineer evaluating a candidate's answer in a Project Technical Ownership Assessment.

PROJECT CONTEXT:
Project: ${projectKnowledge.project}
Tech Stack: ${projectKnowledge.technologies.join(', ')}
Architecture: ${projectKnowledge.architecture.pattern}

SOURCE CODE EVIDENCE FROM REPOSITORY:
"""
${evidenceContext.slice(0, 3000)}
"""

INTERVIEW QUESTION (${question.category}, Difficulty Level ${question.difficultyLevel} - ${question.difficultyLabel}):
"${question.question}"

EXPECTED KEY CONCEPTS:
${question.expectedKeyPoints.join(', ')}

CANDIDATE'S SUBMITTED ANSWER:
"${candidateAnswer}"

${contradiction ? `DETECTED FACTUAL DISCREPANCY: ${contradiction.candidateClaim} vs Repository Fact: ${contradiction.actualRepositoryFact}` : ''}

EVALUATION CRITERIA:
1. Assess whether the candidate actually understands how THIS PROJECT was implemented vs generic buzzwords.
2. If the answer is shallow (e.g. "Because it is easy to use"), set "needsFollowUp": true and provide a sharp follow-up question to test their real understanding.
3. If the candidate contradicts the actual repository implementation, penalize projectUnderstanding and mention the discrepancy politely in feedback.

Respond with strict JSON ONLY:
{
  "overallScore": number (0-100),
  "technicalCorrectness": number (0-100),
  "projectUnderstanding": number (0-100),
  "implementationUnderstanding": number (0-100),
  "reasoning": number (0-100),
  "codeMatch": number (0-100),
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingConcepts": ["string"],
  "feedback": "string (clear 2-3 sentence coaching feedback)",
  "needsFollowUp": boolean,
  "followUpQuestion": "string or null"
}`;

  const aiRes = await LLMProvider.completeJson<any>(prompt);

  if (aiRes && typeof aiRes.overallScore === 'number') {
    return {
      overallScore: Math.min(100, Math.max(0, aiRes.overallScore)),
      technicalCorrectness: aiRes.technicalCorrectness ?? aiRes.overallScore,
      projectUnderstanding: aiRes.projectUnderstanding ?? aiRes.overallScore,
      implementationUnderstanding: aiRes.implementationUnderstanding ?? aiRes.overallScore,
      reasoning: aiRes.reasoning ?? aiRes.overallScore,
      codeMatch: aiRes.codeMatch ?? aiRes.overallScore,
      strengths: Array.isArray(aiRes.strengths) ? aiRes.strengths : ['Grounded response'],
      weaknesses: Array.isArray(aiRes.weaknesses) ? aiRes.weaknesses : [],
      missingConcepts: Array.isArray(aiRes.missingConcepts) ? aiRes.missingConcepts : [],
      feedback: aiRes.feedback || 'Evaluated against repository implementation.',
      isShallow,
      needsFollowUp: !!aiRes.needsFollowUp || isShallow,
      followUpQuestion: aiRes.followUpQuestion || (isShallow ? `Can you elaborate on specific implementation details or trade-offs in your code?` : undefined),
      contradictionAlert: contradiction || undefined,
    };
  }

  // Robust Fallback Evaluation Heuristic
  return fallbackEvaluation(candidateAnswer, question, contradiction, isShallow, words.length);
}

function fallbackEvaluation(
  answer: string,
  question: GeneratedQuestion,
  contradiction: ContradictionAlert | null,
  isShallow: boolean,
  wordCount: number
): DetailedAnswerEvaluation {
  let score = 55;
  if (wordCount > 30) score += 20;
  if (wordCount > 60) score += 10;

  if (contradiction) {
    score = Math.max(35, score - 25);
  }

  const techCorrectness = Math.min(95, score + 5);
  const projUnderstanding = contradiction ? 40 : Math.min(95, score);
  const implUnderstanding = Math.min(95, score - 5);
  const reasoning = Math.min(95, score);

  return {
    overallScore: score,
    technicalCorrectness: techCorrectness,
    projectUnderstanding: projUnderstanding,
    implementationUnderstanding: implUnderstanding,
    reasoning,
    codeMatch: contradiction ? 30 : Math.min(90, score),
    strengths: wordCount > 25 ? ['Demonstrated understanding of feature lifecycle', 'Addressed prompt directly'] : ['Direct response'],
    weaknesses: isShallow ? ['Answer is very brief; lacks technical mechanics', 'Missing edge cases and architectural trade-offs'] : ['Could include concrete file/class references'],
    missingConcepts: isShallow ? ['Concrete error handling', 'Component/service interaction steps'] : [],
    feedback: contradiction
      ? `${contradiction.politeInquiry} Overall, solid communication but clarify repository implementation details.`
      : (isShallow ? 'Your answer touches the concept but needs concrete depth regarding how your code implements it.' : 'Solid answer demonstrating good comprehension of the project logic.'),
    isShallow,
    needsFollowUp: isShallow || !!contradiction,
    followUpQuestion: contradiction
      ? contradiction.politeInquiry
      : (isShallow ? `What specific characteristics of your code and data models make this approach suitable?` : undefined),
    contradictionAlert: contradiction || undefined,
  };
}
