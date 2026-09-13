/**
 * Contradiction Detection Engine
 * Identifies discrepancies between candidate claims and the actual repository implementation.
 */

import { ProjectKnowledgeRepresentation } from '../analysis/projectKnowledgeBuilder';

export interface ContradictionAlert {
  hasContradiction: boolean;
  topic: string;
  candidateClaim: string;
  actualRepositoryFact: string;
  politeInquiry: string;
}

export function detectContradictions(
  candidateAnswer: string,
  projectKnowledge: ProjectKnowledgeRepresentation
): ContradictionAlert | null {
  const lowerAnswer = candidateAnswer.toLowerCase();
  const tech = projectKnowledge.techStackDetailed;

  // 1. Database Contradiction (e.g. candidate claims Postgres/MySQL, but repo uses MongoDB)
  if (tech.databases.includes('MongoDB') && (lowerAnswer.includes('postgresql') || lowerAnswer.includes('postgres') || lowerAnswer.includes('mysql') || lowerAnswer.includes('relational schema'))) {
    if (!tech.databases.includes('PostgreSQL') && !tech.databases.includes('MySQL')) {
      return {
        hasContradiction: true,
        topic: 'Database Architecture',
        candidateClaim: 'Mentioned relational database (PostgreSQL/MySQL)',
        actualRepositoryFact: `Repository uses MongoDB (${projectKnowledge.databaseModels.map((m) => m.name).join(', ') || 'Document collections'})`,
        politeInquiry: `Your repository appears to use MongoDB with document schemas. Can you explain where relational tables or PostgreSQL/MySQL are implemented in this project?`,
      };
    }
  }

  // 2. Authentication Contradiction (e.g. candidate claims session/cookies on server, but repo uses stateless JWT)
  if (tech.authentication.some((a) => a.includes('JWT')) && lowerAnswer.includes('session-based') && lowerAnswer.includes('server-side session store')) {
    return {
      hasContradiction: true,
      topic: 'Authentication Model',
      candidateClaim: 'Claimed server-side stateful sessions',
      actualRepositoryFact: 'Repository implements stateless JWT token verification',
      politeInquiry: `Your repository source code appears to use stateless JWT authentication. Can you clarify how session state is persisted across requests?`,
    };
  }

  // 3. State Management Contradiction (e.g. candidate claims Redux, but repo uses Zustand or vice-versa)
  if (tech.stateManagement.includes('Zustand') && lowerAnswer.includes('redux store') && !lowerAnswer.includes('zustand')) {
    return {
      hasContradiction: true,
      topic: 'State Management',
      candidateClaim: 'Claimed Redux action/reducer architecture',
      actualRepositoryFact: 'Repository manifests specify Zustand for state management',
      politeInquiry: `Your package manifest uses Zustand. Can you explain where Redux actions or reducers are located?`,
    };
  }

  // 4. Backend Framework Contradiction (e.g. candidate claims Django/FastAPI, but repo is Next.js/Express)
  if (tech.backendFrameworks.includes('Next.js') || tech.backendFrameworks.includes('Express.js')) {
    if (lowerAnswer.includes('django') || lowerAnswer.includes('spring boot') || lowerAnswer.includes('laravel')) {
      return {
        hasContradiction: true,
        topic: 'Backend Framework',
        candidateClaim: 'Mentioned Django / Spring Boot / Laravel backend',
        actualRepositoryFact: `Repository is built with ${projectKnowledge.architecture.pattern}`,
        politeInquiry: `The repository implementation is structured around ${tech.backendFrameworks.join('/')}. Could you clarify where this alternative backend framework is deployed?`,
      };
    }
  }

  return null;
}
