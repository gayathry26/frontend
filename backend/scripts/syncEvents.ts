/**
 * CLI Sync Script — Multi-Source Event Aggregation
 *
 * Usage:
 *   npx tsx backend/scripts/syncEvents.ts
 *   npx tsx backend/scripts/syncEvents.ts --dry-run
 *   npx tsx backend/scripts/syncEvents.ts --sources=Brabble,Devfolio
 *
 * This script triggers the full multi-source event ingestion pipeline
 * and prints a detailed sync report to the console.
 */

import path from 'path';
import { config } from 'dotenv';

// Load .env.local first (Next.js convention), then fall back to .env
config({ path: path.resolve(process.cwd(), '.env.local'), override: false });
config({ path: path.resolve(process.cwd(), '.env'), override: false });

import { runEventAggregation } from '../services/events/eventAggregator';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const sourceArg = args.find(a => a.startsWith('--sources='));
  const sourcesFilter = sourceArg
    ? sourceArg.replace('--sources=', '').split(',').map(s => s.trim())
    : undefined;

  console.log('\n' + '='.repeat(60));
  console.log('  IT Career Explorer — Multi-Source Event Sync');
  console.log('='.repeat(60));
  if (dryRun) console.log('  ⚠️  DRY RUN MODE — No database writes will be performed');
  if (sourcesFilter) console.log(`  🔧 Running only: ${sourcesFilter.join(', ')}`);
  console.log('='.repeat(60) + '\n');

  const report = await runEventAggregation({
    dryRun,
    sources: sourcesFilter
  });

  console.log('\n' + '='.repeat(60));
  console.log('  SYNC REPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Sync ID:          ${report.syncId}`);
  console.log(`  Started:          ${report.startedAt}`);
  console.log(`  Completed:        ${report.completedAt}`);
  console.log(`  Duration:         ${(report.durationMs / 1000).toFixed(2)}s`);
  console.log('');
  console.log(`  Sources Attempted:  ${report.sourcesAttempted.join(', ') || 'none'}`);
  console.log(`  Sources Succeeded:  ${report.sourcesSucceeded.join(', ') || 'none'}`);
  console.log(`  Sources Failed:     ${report.sourcesFailed.join(', ') || 'none'}`);
  console.log('');
  console.log(`  Fetched (total):       ${report.fetchedCount}`);
  console.log(`  India-Relevant:        ${report.indiaRelevantCount}`);
  console.log(`  After Deduplication:   ${report.afterDeduplicationCount}`);
  console.log('');
  console.log(`  ✅ New Events:         ${report.newCount}`);
  console.log(`  🔄 Updated Events:     ${report.updatedCount}`);
  console.log(`  ⏰ Expired:            ${report.expiredCount}`);
  console.log(`  ❌ Failed:             ${report.failedCount}`);

  if (report.errors.length > 0) {
    console.log('\n  ERRORS:');
    report.errors.forEach(e => console.log(`    - ${e}`));
  }

  console.log('='.repeat(60) + '\n');

  process.exit(report.failedCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error in syncEvents:', err);
  process.exit(1);
});
