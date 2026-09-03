import { getDb, isMongoConfigured } from '../config/mongodb';
import { calculateContentHash } from './normalizationService';
import { extractRoleInfoWithGroq, GroqExtractionResult } from './groqExtractionService';
import { resolveRoleDeterministically } from './roleMatcherService';
import { addSkillToRoleInDb, addToolToRoleInDb, getRoleBySlugFromDb } from './roleService';
import { sendWhatsAppNotification } from './notificationService';
import { revalidatePath } from 'next/cache';

export interface SourceConfig {
  id: string;
  name: string;
  type: 'RSS' | 'API' | 'BLOG';
  url: string;
  enabled: boolean;
  priority: number;
}

export interface PipelineExecutionSummary {
  sourcesChecked: number;
  sourcesFailed: number;
  newRolesDetected: number;
  updatedRoles: number;
  mongoUpdatesApplied: number;
  notificationsSent: number;
  updateLogs: any[];
}

const DEFAULT_TRUSTED_SOURCES: SourceConfig[] = [
  { id: 'src-aws-tech', name: 'AWS Architecture Blog', type: 'RSS', url: 'https://aws.amazon.com/blogs/architecture/feed/', enabled: true, priority: 1 },
  { id: 'src-google-dev', name: 'Google Developers Blog', type: 'RSS', url: 'https://developers.googleblog.com/feeds/posts/default', enabled: true, priority: 1 },
  { id: 'src-microsoft-eng', name: 'Microsoft Engineering Blog', type: 'RSS', url: 'https://devblogs.microsoft.com/feed/', enabled: true, priority: 2 }
];

export async function runAutomationPipeline(options?: { forceRun?: boolean; autoUpdateOn?: boolean }): Promise<PipelineExecutionSummary> {
  const autoUpdate = options?.autoUpdateOn ?? true;
  const summary: PipelineExecutionSummary = {
    sourcesChecked: 0,
    sourcesFailed: 0,
    newRolesDetected: 0,
    updatedRoles: 0,
    mongoUpdatesApplied: 0,
    notificationsSent: 0,
    updateLogs: []
  };

  if (!isMongoConfigured()) {
    console.warn('MongoDB is unconfigured. Running in dry-run verification mode.');
  }

  const db = isMongoConfigured() ? await getDb() : null;

  // 1. Fetch Sources
  let sources = DEFAULT_TRUSTED_SOURCES;
  if (db) {
    try {
      const dbSources = await db.collection<SourceConfig>('source_configs').find({ enabled: true }).toArray();
      if (dbSources.length > 0) sources = dbSources;
    } catch {}
  }

  for (const src of sources) {
    summary.sourcesChecked++;
    try {
      // Mock/Real fetch logic
      const mockText = `AI Engineers increasingly adopt LLM Evaluation, RAG architectures, and Agentic AI workflows using tools like LangSmith and LangChain.`;
      const sourceTitle = `Next-Gen AI Engineering Practices - ${src.name}`;
      const sourceUrl = src.url;
      const contentHash = calculateContentHash(sourceTitle + mockText);

      // Check duplicate content hash
      if (db && !options?.forceRun) {
        const existingHash = await db.collection('source_content_hashes').findOne({ contentHash });
        if (existingHash) {
          console.log(`⏭️ Skipping duplicate content from ${src.name} (Hash matched).`);
          continue;
        }
      }

      // 2. Groq Extraction
      const extraction: GroqExtractionResult = await extractRoleInfoWithGroq(sourceTitle, mockText, src.name, sourceUrl);

      if (extraction.changeType === 'NO_MEANINGFUL_CHANGE') {
        continue;
      }

      // 3. Resolve Role
      const roleMatch = await resolveRoleDeterministically(extraction.role.title);
      let targetRole = roleMatch.matchedRole;
      let targetSlug = targetRole ? targetRole.id : extraction.role.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // 4. Compare Skills & Tools
      const existingTech = new Set(targetRole?.technicalSkills || []);
      const existingTools = new Set(targetRole?.tools || []);

      const addedTech = extraction.newTechnicalSkills.filter(s => !existingTech.has(s));
      const addedTools = extraction.newTools.filter(t => !existingTools.has(t));

      const hasMeaningfulChange = addedTech.length > 0 || addedTools.length > 0 || roleMatch.matchType === 'NONE';

      if (!hasMeaningfulChange) {
        continue;
      }

      const highConfidence = extraction.confidence >= 0.90 && roleMatch.matchType !== 'NONE';
      const status = (autoUpdate && highConfidence) ? 'APPLIED' : 'PENDING_REVIEW';

      if (roleMatch.matchType === 'NONE') summary.newRolesDetected++;
      else summary.updatedRoles++;

      // 5. Apply Safe Atomic Update
      if (status === 'APPLIED' && targetRole && isMongoConfigured()) {
        for (const tech of addedTech) {
          await addSkillToRoleInDb(targetSlug, 'technicalSkills', tech);
        }
        for (const tool of addedTools) {
          await addToolToRoleInDb(targetSlug, tool);
        }
        summary.mongoUpdatesApplied++;
      }

      // 6. Record Update Log
      const nowStr = new Date().toISOString();
      const dateFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const logDoc = {
        roleId: targetSlug,
        roleTitle: targetRole ? targetRole.title : extraction.role.title,
        category: targetRole ? targetRole.category : extraction.role.category,
        changeType: roleMatch.matchType === 'NONE' ? 'NEW_ROLE' : 'UPDATED_ROLE',
        addedTechnicalSkills: addedTech,
        addedSoftSkills: extraction.newSoftSkills,
        addedTools: addedTools,
        sourceName: src.name,
        sourceUrl: src.url,
        confidence: extraction.confidence,
        status,
        detectedAt: nowStr,
        contentHash,
        reason: extraction.reason
      };

      if (db) {
        await db.collection('role_update_logs').insertOne(logDoc);
        await db.collection('source_content_hashes').insertOne({ contentHash, createdAt: nowStr });
      }

      summary.updateLogs.push(logDoc);

      // 7. Send Phone Notification (WhatsApp)
      if (status === 'APPLIED') {
        const notifResult = await sendWhatsAppNotification({
          roleTitle: logDoc.roleTitle,
          category: logDoc.category,
          slug: targetSlug,
          addedTechnicalSkills: addedTech,
          addedSoftSkills: extraction.newSoftSkills,
          addedTools: addedTools,
          sourceName: src.name,
          sourceUrl: src.url,
          confidence: extraction.confidence,
          updatedAtDate: dateFormatted
        });

        if (notifResult.success) summary.notificationsSent++;
      }

    } catch (err: any) {
      console.error(`Error processing source ${src.name}:`, err.message);
      summary.sourcesFailed++;
    }
  }

  return summary;
}
