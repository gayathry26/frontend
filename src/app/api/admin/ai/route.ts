import { NextResponse } from 'next/server';
import { getAllRolesFromDb, getRoleBySlugFromDb, upsertRoleInDb } from '@/backend/services/roleService';
import { getContributions } from '@/backend/services/contributionService';
import { logAdminAction } from '@/backend/services/auditService';
import { parseNaturalLanguageIntent, isConfirmationMessage } from '@/backend/services/aiParserService';
import { ITRole } from '@/backend/types/role';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message || '';
    const history = body.history || [];
    const pendingAction = body.pendingAction || null;

    if (!message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const allRoles = await getAllRolesFromDb();
    const lowerMessage = message.trim().toLowerCase();

    // 1. CONFIRMATION INTERCEPTION FIRST
    const isConfirm = isConfirmationMessage(lowerMessage);
    if ((isConfirm || pendingAction) && pendingAction) {
      const execResult = await executeRoleAction(pendingAction, 'admin');
      return NextResponse.json({
        type: 'action_confirmed',
        reply: execResult.message,
        role: execResult.updatedRole,
        requiresConfirmation: false
      });
    }

    // 2. INTENT CLASSIFICATION WITH DETERMINISTIC ROLE RESOLVER
    const action = parseNaturalLanguageIntent(message, allRoles, history, false);

    // 2.1. CONFIRM PENDING ACTION FROM HISTORY
    if (action.action === 'CONFIRM_PENDING') {
      const recentBotMsg = [...history].reverse().find(h => h.role === 'assistant' && h.proposedAction);
      if (recentBotMsg && recentBotMsg.proposedAction) {
        const execResult = await executeRoleAction(recentBotMsg.proposedAction, 'admin');
        return NextResponse.json({
          type: 'action_confirmed',
          reply: execResult.message,
          role: execResult.updatedRole,
          requiresConfirmation: false
        });
      }
    }

    // 2.2. AMBIGUOUS / MULTI-MATCH CLARIFICATION (Requirement 22 & 29)
    if (action.action === 'CLARIFY_ROLE') {
      return NextResponse.json({
        action,
        type: 'query_result',
        reply: action.summaryText,
        data: action.candidates
      });
    }

    // 2.3. NO ROLE FOUND & CONVERSATIONAL REPLIES
    if (action.action === 'NO_ROLE_FOUND' || action.action === 'CONVERSATIONAL_REPLY') {
      return NextResponse.json({
        action,
        type: 'text_reply',
        reply: action.summaryText
      });
    }

    // 3. REVIEW CONTRIBUTIONS
    if (action.action === 'REVIEW_CONTRIBUTIONS') {
      const pending = await getContributions('pending');
      return NextResponse.json({
        action,
        type: 'query_result',
        reply: `There are currently **${pending.length} pending submission(s)** from IT professionals.`,
        data: pending
      });
    }

    // 3.5. EVENT SYNC COMMAND INTERCEPTION
    const isSyncCommand =
      (lowerMessage.includes('sync') && (lowerMessage.includes('hackathon') || lowerMessage.includes('event') || lowerMessage.includes('opportunit'))) ||
      lowerMessage.includes('run sync') ||
      lowerMessage.includes('start sync') ||
      lowerMessage.includes('trigger sync') ||
      lowerMessage.includes('fetch events') ||
      lowerMessage.includes('ingest events') ||
      lowerMessage.includes('aggregate events') ||
      (lowerMessage.includes('sync') && lowerMessage.includes('all'));

    if (isSyncCommand) {
      try {
        const dryRun = lowerMessage.includes('dry run') || lowerMessage.includes('dry-run') || lowerMessage.includes('test sync');
        const { runEventAggregation } = await import('@/backend/services/events/eventAggregator');

        const report = await runEventAggregation({ dryRun });

        const sourceList = report.sourcesSucceeded.length > 0
          ? report.sourcesSucceeded.join(', ')
          : 'No sources succeeded';

        const failureInfo = report.sourcesFailed.length > 0
          ? `\n\n⚠️ **Failed Sources**: ${report.sourcesFailed.join(', ')}`
          : '';

        return NextResponse.json({
          action,
          type: 'sync_result',
          reply: `${dryRun ? '🔍 **Dry Run** — ' : ''}**Event Sync Complete** in ${(report.durationMs / 1000).toFixed(1)}s\n\n` +
            `📡 **Sources**: ${sourceList}\n` +
            `📥 **Fetched**: ${report.fetchedCount} total\n` +
            `🇮🇳 **India-Relevant**: ${report.indiaRelevantCount}\n` +
            `🔄 **After Deduplication**: ${report.afterDeduplicationCount}\n\n` +
            `✅ **New Events**: ${report.newCount}\n` +
            `🔁 **Updated**: ${report.updatedCount}\n` +
            `⏰ **Expired**: ${report.expiredCount}\n` +
            `❌ **Failed**: ${report.failedCount}` +
            failureInfo +
            `\n\n[View Live Opportunities](/opportunities)`,
          data: report
        });
      } catch (syncErr: any) {
        return NextResponse.json({
          action,
          type: 'text_reply',
          reply: `⚠️ Sync encountered an error: ${syncErr.message}\n\nPlease check server logs for details.`
        });
      }
    }

    // 4. SEARCH / GET ROLE DETAILS
    if (action.action === 'SEARCH_ROLES') {
      if (action.targetRole) {
        const r = action.targetRole;
        const matchInfo = action.matchReason ? `\n\n*${action.matchReason}*` : '';
        return NextResponse.json({
          action,
          type: 'query_result',
          reply: `I found **${r.title}** (${r.category}).${matchInfo}\n\n**Technical Skills**:\n${r.technicalSkills?.map(s => `• ${s}`).join('\n') || 'None'}\n\n**Soft Skills**:\n${r.softSkills?.map(s => `• ${s}`).join('\n') || 'None'}\n\n**Average Salary**: ${r.stats?.averageSalary || 'N/A'}\n**Market Demand**: ${r.jobMarketProjection || 'High'}`,
          data: [r]
        });
      }

      let results = allRoles;
      if (action.searchSkill) {
        results = results.filter(r => r.technicalSkills?.some(s => s.toLowerCase() === action.searchSkill?.toLowerCase()));
      }

      const formattedList = results.map(r => `• **${r.title}** (${r.category}) — Tech: ${r.technicalSkills?.slice(0, 4).join(', ') || 'N/A'}`);

      return NextResponse.json({
        action,
        type: 'query_result',
        reply: results.length > 0 
          ? `Found **${results.length} role(s)** in MongoDB Atlas:\n\n${formattedList.join('\n')}`
          : `No matching roles found in MongoDB Atlas for query '${message}'.`,
        data: results
      });
    }

    // 5. PROPOSED UPDATE / CREATE / DELETE (Requires Confirmation)
    if (action.action === 'UPDATE_SKILLS' || action.action === 'UPDATE_FIELD') {
      const currentRole = action.targetRole || (action.roleId ? await getRoleBySlugFromDb(action.roleId) : null);

      if (!currentRole) {
        return NextResponse.json({
          action,
          type: 'text_reply',
          reply: `I couldn't locate the specified role. Available roles: ${allRoles.slice(0, 5).map(r => r.title).join(', ')}`
        });
      }

      const currentTech = currentRole.technicalSkills || [];
      const currentSoft = currentRole.softSkills || [];

      const addTech = action.addTechnicalSkills || [];
      const removeTech = action.removeTechnicalSkills || [];

      const addSoft = action.addSoftSkills || [];
      const removeSoft = action.removeSoftSkills || [];

      const actionPayload = {
        action: action.action,
        roleId: currentRole.id,
        roleTitle: currentRole.title,
        targetField: action.targetField,
        addTechnicalSkills: addTech,
        removeTechnicalSkills: removeTech,
        addSoftSkills: addSoft,
        removeSoftSkills: removeSoft,
        updateFields: action.updateFields
      };

      const changeSummary: string[] = [];
      if (addTech.length > 0) changeSummary.push(`+ Add Technical Skill: **${addTech.join(', ')}**`);
      if (removeTech.length > 0) changeSummary.push(`- Remove Technical Skill: **${removeTech.join(', ')}**`);
      if (addSoft.length > 0) changeSummary.push(`+ Add Soft Skill: **${addSoft.join(', ')}**`);
      if (removeSoft.length > 0) changeSummary.push(`- Remove Soft Skill: **${removeSoft.join(', ')}**`);
      if (action.updateFields?.salaryRange) changeSummary.push(`⚡ Salary: **${action.updateFields.salaryRange}**`);

      const reasonHeader = action.matchReason ? `*(Resolved via ${action.matchReason})*\n\n` : '';
      const currentOverview = action.targetField === 'softSkills'
        ? `**Current Soft Skills**:\n${currentSoft.length > 0 ? currentSoft.join(', ') : 'None'}`
        : `**Current Technical Skills**:\n${currentTech.length > 0 ? currentTech.join(', ') : 'None'}`;

      return NextResponse.json({
        action,
        type: 'proposed_action',
        role: currentRole,
        actionPayload,
        reply: `I found **${currentRole.title}**.\n\n${reasonHeader}${currentOverview}\n\n**Proposed Changes**:\n${changeSummary.join('\n')}\n\nWould you like me to apply this update to MongoDB Atlas?`,
        requiresConfirmation: true
      });
    }

    // 6. CREATE ROLE PROPOSAL
    if (action.action === 'CREATE_ROLE') {
      return NextResponse.json({
        action,
        type: 'proposed_action',
        actionPayload: {
          action: 'CREATE_ROLE',
          newRoleData: action.newRoleData
        },
        reply: `I am ready to create new role **${action.newRoleData?.title}** under category **${action.newRoleData?.category}**.\n\nWould you like me to create this role in MongoDB Atlas?`,
        requiresConfirmation: true
      });
    }

    // 7. UNKNOWN / HELP
    return NextResponse.json({
      action,
      type: 'text_reply',
      reply: action.summaryText
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI processing error' }, { status: 500 });
  }
}

async function executeRoleAction(actionPayload: any, adminId: string = 'admin'): Promise<{ message: string; updatedRole: ITRole }> {
  const { action, roleId, addTechnicalSkills, removeTechnicalSkills, addSoftSkills, removeSoftSkills, updateFields, newRoleData } = actionPayload;

  if (action === 'CREATE_ROLE' && newRoleData) {
    const created = await upsertRoleInDb(newRoleData as ITRole, adminId);
    await logAdminAction({ adminId, action: 'CREATE_ROLE', roleId: created.id, after: created, status: 'success' });
    return {
      message: `Update confirmed!\n\n**${created.title}** has been created successfully in MongoDB Atlas.\n\nLast Updated: ${created.updatedAt}`,
      updatedRole: created
    };
  }

  const existingRole = await getRoleBySlugFromDb(roleId);
  if (!existingRole) {
    throw new Error(`Role '${roleId}' not found in database.`);
  }

  let newTech = [...(existingRole.technicalSkills || [])];
  let newSoft = [...(existingRole.softSkills || [])];
  const addedList: string[] = [];
  const removedList: string[] = [];

  if (addTechnicalSkills && Array.isArray(addTechnicalSkills)) {
    addTechnicalSkills.forEach(s => {
      const exists = newTech.some(ex => ex.toLowerCase() === s.toLowerCase());
      if (!exists) {
        newTech.push(s);
        addedList.push(`Technical Skill: ${s}`);
      }
    });
  }

  if (addSoftSkills && Array.isArray(addSoftSkills)) {
    addSoftSkills.forEach(s => {
      const exists = newSoft.some(ex => ex.toLowerCase() === s.toLowerCase());
      if (!exists) {
        newSoft.push(s);
        addedList.push(`Soft Skill: ${s}`);
      }
    });
  }

  if (removeTechnicalSkills && Array.isArray(removeTechnicalSkills)) {
    removeTechnicalSkills.forEach(s => {
      newTech = newTech.filter(ex => ex.toLowerCase() !== s.toLowerCase());
      removedList.push(`Technical Skill: ${s}`);
    });
  }

  if (removeSoftSkills && Array.isArray(removeSoftSkills)) {
    removeSoftSkills.forEach(s => {
      newSoft = newSoft.filter(ex => ex.toLowerCase() !== s.toLowerCase());
      removedList.push(`Soft Skill: ${s}`);
    });
  }

  const mergedRole: ITRole = {
    ...existingRole,
    technicalSkills: Array.from(new Set(newTech)),
    softSkills: Array.from(new Set(newSoft)),
    shortDescription: updateFields?.shortDescription || existingRole.shortDescription,
    jobMarketProjection: updateFields?.jobMarketProjection || existingRole.jobMarketProjection,
    stats: updateFields?.salaryRange ? {
      averageSalary: updateFields.salaryRange,
      jobOpenings: existingRole.stats?.jobOpenings || '50k+',
      growthRate: existingRole.stats?.growthRate || '20%'
    } : existingRole.stats
  };

  // 1. Update MongoDB Atlas
  await upsertRoleInDb(mergedRole, adminId);

  // 2. Fetch updated document back from MongoDB to verify actual database state
  const verifiedRole = await getRoleBySlugFromDb(roleId);
  if (!verifiedRole) {
    throw new Error('Database verification failed after update.');
  }

  // 3. Log audit action
  await logAdminAction({
    adminId,
    action: 'UPDATE_ROLE',
    roleId,
    before: existingRole,
    after: verifiedRole,
    status: 'success',
    details: `Added: [${addedList.join(', ')}], Removed: [${removedList.join(', ')}]`
  });

  const changeText: string[] = [];
  if (addedList.length > 0) changeText.push(`Added:\n+ ${addedList.join('\n+ ')}`);
  if (removedList.length > 0) changeText.push(`Removed:\n- ${removedList.join('\n- ')}`);

  const updatedSkillsList = actionPayload.targetField === 'softSkills'
    ? `**Current Soft Skills**:\n${(verifiedRole.softSkills || []).join(', ')}`
    : `**Current Technical Skills**:\n${(verifiedRole.technicalSkills || []).join(', ')}`;

  return {
    message: `Update confirmed.\n\n**${verifiedRole.title}** has been updated successfully in MongoDB Atlas.\n\n${changeText.join('\n\n')}\n\n${updatedSkillsList}\n\n**Last Updated**: ${verifiedRole.updatedAt}`,
    updatedRole: verifiedRole
  };
}
