import { parseGitHubUrl } from '../github/githubService';
import { loadSampleRepository, SAMPLE_REPOSITORIES } from '../github/repositoryFetcher';
import { detectTechnologies } from '../analysis/technologyDetector';
import { buildProjectKnowledge } from '../analysis/projectKnowledgeBuilder';
import { chunkSourceFiles } from '../rag/chunker';
import { generateAdaptiveQuestion } from '../interview/questionGenerator';
import { detectContradictions } from '../evaluation/contradictionDetector';
import { calculateOwnershipConfidence } from '../evaluation/confidenceAnalyzer';
import { createInterviewSession, submitAdaptiveAnswer } from '../interview/adaptiveInterviewEngine';

async function runTests() {
  console.log('=== 1. TEST GITHUB URL PARSER ===');
  const url1 = parseGitHubUrl('https://github.com/facebook/react');
  console.log('Parse standard URL:', url1?.fullName === 'facebook/react' ? 'PASS' : 'FAIL', url1);

  const url2 = parseGitHubUrl('github.com/tiangolo/fastapi.git');
  console.log('Parse git suffix URL:', url2?.fullName === 'tiangolo/fastapi' ? 'PASS' : 'FAIL', url2);

  const url3 = parseGitHubUrl('spring-projects/spring-boot');
  console.log('Parse shorthand URL:', url3?.fullName === 'spring-projects/spring-boot' ? 'PASS' : 'FAIL', url3);

  console.log('\n=== 2. TEST SAMPLE REPOSITORIES & MULTI-STACK DETECTION ===');
  for (const sample of SAMPLE_REPOSITORIES) {
    const repo = loadSampleRepository(sample.id);
    const tech = detectTechnologies(repo);
    console.log(`[${sample.name}] Detected:`);
    console.log(`  - Primary Stack: ${tech.primaryStackLabel}`);
    console.log(`  - Languages: ${tech.languages.join(', ')}`);
    console.log(`  - Frontend: ${tech.frontendFrameworks.join(', ') || 'None'}`);
    console.log(`  - Backend: ${tech.backendFrameworks.join(', ') || 'None'}`);
    console.log(`  - Databases: ${tech.databases.join(', ') || 'None'}`);
    console.log(`  - Auth: ${tech.authentication.join(', ') || 'None'}`);
  }

  console.log('\n=== 3. TEST PROJECT KNOWLEDGE REPRESENTATION & GRAPH ===');
  const nextMongoRepo = loadSampleRepository('sample_ecommerce_next_mongo');
  const knowledge = buildProjectKnowledge(nextMongoRepo);
  console.log('Project Name:', knowledge.project);
  console.log('Features Detected:', knowledge.features);
  console.log('APIs Discovered:', knowledge.apis.map(a => `${a.method} ${a.path}`));
  console.log('Database Models:', knowledge.databaseModels.map(m => m.name));
  console.log('Code Defense Snippets:', knowledge.codeDefenseSnippets.map(s => `${s.name} (${s.filePath})`));
  console.log('Knowledge Graph Nodes:', knowledge.knowledgeGraph.nodes.length);
  console.log('Knowledge Graph Links:', knowledge.knowledgeGraph.links.length);

  console.log('\n=== 4. TEST CODE CHUNKER ===');
  const chunks = chunkSourceFiles(nextMongoRepo.id, nextMongoRepo.analyzedFiles);
  console.log(`Generated ${chunks.length} chunks with preserved metadata.`);

  console.log('\n=== 5. TEST QUESTION GENERATION ACROSS CATEGORIES ===');
  const q1 = await generateAdaptiveQuestion({
    projectKnowledge: knowledge,
    chunks,
    questionNumber: 1,
    targetCategory: 'PROJECT_UNDERSTANDING',
    targetDifficulty: 1,
    previousQuestions: [],
  });
  console.log(`Q1 (${q1.category} - ${q1.difficultyLabel}): ${q1.question}`);
  console.log(`   Why asked: ${q1.reasonWhyAsked}`);

  const q2 = await generateAdaptiveQuestion({
    projectKnowledge: knowledge,
    chunks,
    questionNumber: 2,
    targetCategory: 'CODE_DEFENSE',
    targetDifficulty: 3,
    previousQuestions: [q1.question],
  });
  console.log(`Q2 (${q2.category} - ${q2.difficultyLabel}): ${q2.question}`);
  if (q2.codeSnippet) {
    console.log(`   Code snippet attached from: ${q2.codeSnippet.filePath} (lines ${q2.codeSnippet.startLine}-${q2.codeSnippet.endLine})`);
  }

  console.log('\n=== 6. TEST CONTRADICTION DETECTOR ===');
  // Candidate incorrectly claims PostgreSQL and session cookies when the repo uses MongoDB & JWT
  const contradictionTest = detectContradictions(
    "In our architecture, we use PostgreSQL with relational schemas and session-based authentication stored in Redis.",
    knowledge
  );
  console.log('Contradiction detected correctly?', contradictionTest?.hasContradiction === true ? 'PASS' : 'FAIL');
  console.log('Discrepancy:', contradictionTest?.candidateClaim, 'vs', contradictionTest?.actualRepositoryFact);
  console.log('Polite inquiry:', contradictionTest?.politeInquiry);

  console.log('\n=== 7. TEST ADAPTIVE INTERVIEW SESSION & ANSWER EVALUATION ===');
  const session = await createInterviewSession({
    projectId: nextMongoRepo.id,
    projectKnowledge: knowledge,
    chunks,
    mode: 'QUICK',
  });
  console.log(`Session created: ${session.sessionId}, Mode: ${session.mode}, Max Questions: ${session.maxQuestions}`);
  console.log(`Initial Question: ${session.records[0].question.question}`);

  // Submit Answer 1
  const ansResult = await submitAdaptiveAnswer({
    sessionId: session.sessionId,
    answer: "Our project is an e-commerce platform built with Next.js 14 App Router, MongoDB Atlas, and Stripe checkout. We handle customer orders with JWT authentication and Zustand for cart state.",
  });
  console.log(`Answer 1 evaluated score: ${ansResult.evaluation.overallScore}/100`);
  console.log(`Next adaptive question: ${ansResult.nextQuestion?.question}`);

  console.log('\n=== 8. TEST OWNERSHIP CONFIDENCE ANALYZER ===');
  const confidence = calculateOwnershipConfidence([ansResult.evaluation]);
  console.log(`Ownership Confidence: ${confidence.level} (${confidence.confidenceScore}%)`);
  console.log(`Rationale: ${confidence.rationale}`);

  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
}

runTests().catch(console.error);
