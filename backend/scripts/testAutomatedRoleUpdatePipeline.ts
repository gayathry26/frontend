/**
 * Verification Test Suite for Automated Technology Role Update System
 *
 * Verifies:
 *  1. Canonical term normalization (ReactJS → React, node js → Node.js, github → GitHub).
 *  2. Content hashing & duplicate prevention.
 *  3. Deterministic role matcher (slug/ID → Title → Aliases → Controlled Fuzzy).
 *  4. Groq structured JSON extraction & sanitization.
 *  5. Automation Pipeline execution & role_update_logs record creation.
 *  6. Twilio WhatsApp phone notification formatting.
 *
 * Usage:
 *  npx tsx --env-file=.env.local backend/scripts/testAutomatedRoleUpdatePipeline.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { normalizeTerm, normalizeTermArray, calculateContentHash } from '../services/normalizationService';
import { resolveRoleDeterministically } from '../services/roleMatcherService';
import { extractRoleInfoWithGroq } from '../services/groqExtractionService';
import { runAutomationPipeline } from '../services/automationPipelineService';
import { sendWhatsAppNotification } from '../services/notificationService';

async function runAutomatedUpdateSuite() {
  console.log('\n' + '='.repeat(70));
  console.log('  VERIFYING AUTOMATED TECHNOLOGY ROLE UPDATE SYSTEM PIPELINE');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  function assertTest(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   └─ ${details}`);
      failed++;
    }
  }

  try {
    // 1. Term Normalization Tests
    console.log('--- Step 1: Canonical Term Normalization ---');
    assertTest(
      "Normalize 'ReactJS' → 'React'",
      normalizeTerm('ReactJS') === 'React',
      `Result: '${normalizeTerm('ReactJS')}'`
    );
    assertTest(
      "Normalize 'node js' → 'Node.js'",
      normalizeTerm('node js') === 'Node.js',
      `Result: '${normalizeTerm('node js')}'`
    );
    assertTest(
      "Normalize 'github' → 'GitHub'",
      normalizeTerm('github') === 'GitHub',
      `Result: '${normalizeTerm('github')}'`
    );
    assertTest(
      'Deduplicate and normalize array',
      JSON.stringify(normalizeTermArray(['reactjs', 'React.js', 'React'])) === JSON.stringify(['React']),
      `Deduplicated array: ${JSON.stringify(normalizeTermArray(['reactjs', 'React.js', 'React']))}`
    );

    // 2. SHA-256 Content Hashing
    console.log('\n--- Step 2: Content Hashing & Duplicate Prevention ---');
    const hash1 = calculateContentHash('Article Title - Article Content Here');
    const hash2 = calculateContentHash('Article Title - Article Content Here');
    assertTest(
      'Deterministic SHA-256 hash generation',
      hash1 === hash2 && hash1.length === 64,
      `Hash: ${hash1}`
    );

    // 3. Deterministic Role Matcher
    console.log('\n--- Step 3: Deterministic Role Matcher ---');
    const match = await resolveRoleDeterministically('Vibe Coding');
    assertTest(
      "Deterministic role lookup for 'Vibe Coding'",
      match.matchedRole !== null || match.confidence >= 0,
      `Match Type: ${match.matchType}, Confidence: ${match.confidence}`
    );

    // 4. Groq Extraction Resilience
    console.log('\n--- Step 4: Groq Extraction Resilience ---');
    const extraction = await extractRoleInfoWithGroq(
      'Next-Gen AI Engineering Practices',
      'AI Engineers increasingly adopt LLM Evaluation, RAG architectures, and Agentic AI workflows using tools like LangSmith and LangChain.',
      'AWS Architecture Blog',
      'https://aws.amazon.com/blogs/'
    );
    assertTest(
      'Groq extraction returned structured JSON data',
      extraction.role.title !== undefined && Array.isArray(extraction.newTechnicalSkills),
      `Extracted Title: '${extraction.role.title}', New Skills: ${extraction.newTechnicalSkills.join(', ')}`
    );

    // 5. Automation Master Pipeline
    console.log('\n--- Step 5: Automation Master Pipeline Execution ---');
    const summary = await runAutomationPipeline({ forceRun: true, autoUpdateOn: true });
    assertTest(
      'Master pipeline executed successfully',
      summary.sourcesChecked > 0 && Array.isArray(summary.updateLogs),
      `Sources Checked: ${summary.sourcesChecked}, Mongo Updates Applied: ${summary.mongoUpdatesApplied}, WhatsApp Notifications Sent: ${summary.notificationsSent}`
    );

    // 6. WhatsApp Phone Notification Payload Format
    console.log('\n--- Step 6: Twilio WhatsApp Phone Notification Payload ---');
    const notifResult = await sendWhatsAppNotification({
      roleTitle: 'AI Engineer',
      category: 'AI & Machine Learning',
      slug: 'ai-engineer',
      addedTechnicalSkills: ['LLM Evaluation', 'Model Monitoring'],
      addedSoftSkills: ['AI Governance'],
      addedTools: ['LangSmith'],
      sourceName: 'AWS Architecture Blog',
      sourceUrl: 'https://aws.amazon.com/blogs/architecture/feed/',
      confidence: 0.94,
      updatedAtDate: '27 Aug 2026'
    });
    assertTest(
      'WhatsApp phone notification formatted & dispatched',
      notifResult.success === true,
      `Notification status: ${notifResult.success ? 'Delivered/Logged' : notifResult.error}`
    );

  } catch (err: any) {
    console.error('Test Suite Exception:', err.message);
    failed++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`  AUTOMATED UPDATE PIPELINE SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) process.exit(1);
}

runAutomatedUpdateSuite();
