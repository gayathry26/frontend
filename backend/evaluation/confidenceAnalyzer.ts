/**
 * Ownership Confidence Analyzer
 * Determines if the candidate genuinely built or owns the repository.
 * Returns High, Medium, or Low with transparent rationale.
 */

import { DetailedAnswerEvaluation } from './answerEvaluator';

export type OwnershipConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface OwnershipConfidenceResult {
  level: OwnershipConfidenceLevel;
  confidenceScore: number; // 0-100
  rationale: string;
  contributionsVerified: string[];
  riskFactors: string[];
}

export function calculateOwnershipConfidence(evaluations: DetailedAnswerEvaluation[]): OwnershipConfidenceResult {
  if (evaluations.length === 0) {
    return {
      level: 'MEDIUM',
      confidenceScore: 60,
      rationale: 'Insufficient questions completed to determine technical ownership.',
      contributionsVerified: [],
      riskFactors: ['Interview incomplete'],
    };
  }

  const avgOverall = evaluations.reduce((sum, e) => sum + e.overallScore, 0) / evaluations.length;
  const avgCodeMatch = evaluations.reduce((sum, e) => sum + e.codeMatch, 0) / evaluations.length;
  const contradictionCount = evaluations.filter((e) => e.contradictionAlert?.hasContradiction).length;
  const shallowCount = evaluations.filter((e) => e.isShallow).length;

  let score = avgOverall * 0.5 + avgCodeMatch * 0.3 + (100 - shallowCount * 15) * 0.2;
  score = Math.max(0, score - contradictionCount * 20);

  const riskFactors: string[] = [];
  const contributionsVerified: string[] = [];

  if (contradictionCount > 0) {
    riskFactors.push(`Detected ${contradictionCount} contradiction(s) between answers and repository code.`);
  }
  if (shallowCount > 2) {
    riskFactors.push('Multiple answers provided brief surface-level explanations without implementation details.');
  }

  if (avgCodeMatch > 75) {
    contributionsVerified.push('Demonstrated line-by-line understanding of source code snippets.');
  }
  if (avgOverall > 75) {
    contributionsVerified.push('Accurately articulated end-to-end request flow across layers.');
  }

  let level: OwnershipConfidenceLevel = 'MEDIUM';
  let rationale = '';

  if (score >= 78 && contradictionCount === 0) {
    level = 'HIGH';
    rationale = `The candidate demonstrated strong, authoritative understanding of the repository architecture and accurately defended source code implementations with zero technical contradictions.`;
  } else if (score < 55 || contradictionCount >= 2) {
    level = 'LOW';
    rationale = `The candidate exhibited multiple discrepancies with the actual repository implementation, struggled to defend code logic line-by-line, and provided surface-level answers suggesting limited direct ownership.`;
  } else {
    level = 'MEDIUM';
    rationale = `The candidate understood core application concepts and general flow, but struggled with certain lower-level implementation details, error handling edge-cases, or architecture tradeoffs.`;
  }

  return {
    level,
    confidenceScore: Math.round(Math.min(100, Math.max(10, score))),
    rationale,
    contributionsVerified,
    riskFactors,
  };
}
