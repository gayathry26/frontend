import { ITRole } from '../types/role';
import { resolveRoleFromQuery, ResolutionResponse } from './roleResolverService';
import { resolveRoleField, normalizeValue, CanonicalField } from './fieldResolverService';
import { parseDetailedIntentWithNlg, DetailedIntent } from './nlgIntentService';

export interface StructuredAction {
  action: 
    | 'UPDATE_SKILLS' 
    | 'UPDATE_FIELD' 
    | 'CREATE_ROLE' 
    | 'DELETE_ROLE' 
    | 'SEARCH_ROLES' 
    | 'LIST_ROLES' 
    | 'REVIEW_CONTRIBUTIONS' 
    | 'CONFIRM_PENDING'
    | 'CLARIFY_ROLE'
    | 'NO_ROLE_FOUND'
    | 'CONVERSATIONAL_REPLY'
    | 'UNKNOWN';
  roleIdentifier?: string;
  roleId?: string;
  targetRole?: ITRole;
  targetField?: CanonicalField;
  addTechnicalSkills?: string[];
  removeTechnicalSkills?: string[];
  addSoftSkills?: string[];
  removeSoftSkills?: string[];
  updateFields?: {
    salaryRange?: string;
    averageSalary?: string;
    growthRate?: string;
    jobOpenings?: string;
    jobMarketProjection?: string;
    shortDescription?: string;
    scope?: string;
    category?: string;
    tags?: string[];
  };
  newRoleData?: Partial<ITRole>;
  searchQuery?: string;
  searchCategory?: string;
  searchSkill?: string;
  candidates?: ITRole[];
  matchReason?: string;
  summaryText: string;
  requiresConfirmation: boolean;
  destructive?: boolean;
}

const CONFIRMATION_KEYWORDS = [
  'make changes',
  'make this change',
  'do the change',
  'apply the change',
  'apply change',
  'update it',
  'update this',
  'change it',
  'modify it',
  'yes make changes',
  'yes apply it',
  'do it',
  'go ahead',
  'confirm',
  'yes',
  'ok do it',
  'approve'
];

export function isConfirmationMessage(text: string): boolean {
  const clean = text.toLowerCase().trim();
  return CONFIRMATION_KEYWORDS.some(keyword => clean === keyword || clean.startsWith(keyword));
}

/**
 * Rebuilt Main Structured Intent Parser & Conversational State Manager
 */
export function parseNaturalLanguageIntent(
  message: string,
  allRoles: ITRole[],
  conversationHistory: { role: 'user' | 'assistant'; message: string }[] = [],
  hasPendingAction: boolean = false
): StructuredAction {
  const text = message.trim();
  const lowerText = text.toLowerCase();

  // 1. CONFIRMATION INTERCEPTION FIRST
  if (hasPendingAction || isConfirmationMessage(lowerText)) {
    return {
      action: 'CONFIRM_PENDING',
      summaryText: 'User confirmed pending action.',
      requiresConfirmation: false
    };
  }

  // 2. REVIEW CONTRIBUTIONS INTENT
  if (
    lowerText.includes('pending submission') || 
    lowerText.includes('pending contribution') || 
    lowerText.includes('review submission') || 
    lowerText.includes('show submission') || 
    lowerText.includes('show pending')
  ) {
    return {
      action: 'REVIEW_CONTRIBUTIONS',
      summaryText: 'Showing pending IT professional submissions.',
      requiresConfirmation: false
    };
  }

  // 3. DUAL SKILL BLOCK PARSING FIRST (e.g. "technical: AI-assisted coding, LLMs... Soft: Problem Solving... add this in vibe coding")
  const lowerMsg = text.toLowerCase();
  const hasTechBlock = lowerMsg.includes('technical:') || lowerMsg.includes('tech:');
  const hasSoftBlock = lowerMsg.includes('soft:') || lowerMsg.includes('softskills:');

  if (hasTechBlock || hasSoftBlock) {
    const techMatch = text.match(/(?:technical|tech):\s*([\s\S]+?)(?=\s*(?:soft:|add this in|add to|in |to |$))/i);
    const softMatch = text.match(/soft:\s*([\s\S]+?)(?=\s*(?:add this in|add to|in |to |$))/i);

    const techSkills: string[] = [];
    if (techMatch && techMatch[1]) {
      techMatch[1].split(/,|\n|;/).forEach(v => {
        const clean = v.replace(/[\.\,\;\:\n]/g, '').trim();
        if (clean && clean.length >= 2 && !isQuantityWord(clean)) techSkills.push(clean);
      });
    }

    const softSkills: string[] = [];
    if (softMatch && softMatch[1]) {
      softMatch[1].split(/,|\n|;/).forEach(v => {
        const clean = v.replace(/[\.\,\;\:\n]/g, '').trim();
        if (clean && clean.length >= 2 && !isQuantityWord(clean)) softSkills.push(clean);
      });
    }

    const extractedRole = extractRoleQueryFromMessage(text);
    const targetRoleRes = resolveRoleFromQuery(extractedRole, allRoles);
    const targetRole = targetRoleRes.selectedRole;

    if (!targetRole) {
      return {
        action: 'NO_ROLE_FOUND',
        summaryText: `I couldn't find '${extractedRole}' in MongoDB Atlas. Would you like me to create a new role called '${extractedRole}'?`,
        requiresConfirmation: false
      };
    }

    return {
      action: 'UPDATE_SKILLS',
      roleIdentifier: targetRole.title,
      roleId: targetRole.id,
      targetRole,
      addTechnicalSkills: techSkills,
      addSoftSkills: softSkills,
      removeTechnicalSkills: [],
      removeSoftSkills: [],
      summaryText: `Update skills for **${targetRole.title}** in MongoDB Atlas.`,
      requiresConfirmation: true
    };
  }

  // 4. PARSE DETAILED NLU INTENT
  const nluIntent: DetailedIntent = parseIntentWithNlgSync(text, allRoles, conversationHistory);

  // 4. GENERAL CONVERSATION & HELP (No Database Writes)
  if (nluIntent.intent === 'GENERAL_CONVERSATION') {
    return {
      action: 'CONVERSATIONAL_REPLY',
      summaryText: "Hello! I'm your IT Career Hub Admin Assistant. How can I help you manage database roles, skills, or live opportunities today?",
      requiresConfirmation: false
    };
  }

  if (nluIntent.intent === 'HELP' || nluIntent.isQuestion) {
    const helpReply = nluIntent.clarificationMessage ||
      "I can help you manage IT roles in MongoDB Atlas!\n\nHere are examples of what you can ask:\n" +
      "• *Create a Role*: \"Create a new role called AI Product Manager under Management\"\n" +
      "• *Add Skill*: \"Add React & TypeScript to Frontend Developer\"\n" +
      "• *Remove Skill*: \"Remove Angular from Frontend Developer\"\n" +
      "• *Update Salary*: \"Change DevOps Engineer salary to 12-16 LPA\"\n" +
      "• *View Roles*: \"Show all Cybersecurity roles\"\n" +
      "• *Live Event Sync*: \"Sync all available hackathons\"";

    return {
      action: 'CONVERSATIONAL_REPLY',
      summaryText: helpReply,
      requiresConfirmation: false
    };
  }

  // 5. CONVERSATIONAL STATE MULTI-TURN ROLE CREATION DIALOG
  // Check if recent assistant message asked for a role name or category
  const recentAssistantMsg = [...conversationHistory].reverse().find(h => h.role === 'assistant');
  const wasAskedForRoleName = recentAssistantMsg && (
    recentAssistantMsg.message.includes('What should the role be called') ||
    recentAssistantMsg.message.includes('What should the new role be called') ||
    recentAssistantMsg.message.includes('role name')
  );

  if (wasAskedForRoleName && nluIntent.intent !== 'ADD_SKILL' && nluIntent.intent !== 'UPDATE_FIELD') {
    // User is providing the requested role name in response to prompt!
    const roleTitle = normalizeValue(text);
    const category = extractCategoryFromHistory(conversationHistory) || 'Software Development';
    const slug = roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    return {
      action: 'CREATE_ROLE',
      roleIdentifier: roleTitle,
      roleId: slug,
      newRoleData: {
        id: slug,
        title: roleTitle,
        category,
        tags: ['Hybrid'],
        shortDescription: `Role details for ${roleTitle}`,
        alternateNames: [],
        technicalSkills: [],
        softSkills: [],
        careerLadder: [
          { title: `Junior ${roleTitle}`, yearsOfExperience: '0-2 years', salaryRange: '$60k - $80k' },
          { title: `${roleTitle}`, yearsOfExperience: '2-5 years', salaryRange: '$80k - $120k' },
          { title: `Senior ${roleTitle}`, yearsOfExperience: '5+ years', salaryRange: '$120k - $160k' }
        ],
        scope: `Scope and responsibilities for ${roleTitle}`,
        jobMarketProjection: 'Strong growth in tech industry.',
        industry: ['Technology', 'Enterprise']
      },
      summaryText: `I am ready to create **${roleTitle}** under category **${category}** in MongoDB Atlas.\n\nWould you like me to create this role?`,
      requiresConfirmation: true
    };
  }

  // 6. CREATE_ROLE INTENT (Handling missing information)
  if (nluIntent.intent === 'CREATE_ROLE') {
    // If role name is missing (e.g. "add one role in frontend domain") -> ASK USER FOR ROLE NAME! DO NOT WRITE TO MONGODB!
    if (!nluIntent.roleName || nluIntent.missingInformation.includes('roleName')) {
      const domainStr = nluIntent.category ? ` under the ${nluIntent.category} domain` : '';
      return {
        action: 'CONVERSATIONAL_REPLY',
        summaryText: `Sure. I can create a new role${domainStr}. What should the role be called?`,
        requiresConfirmation: false
      };
    }

    // Role Name is provided (e.g. "create a new role called AI Product Manager under Management")
    const title = normalizeValue(nluIntent.roleName);
    const category = nluIntent.category || 'Software Development';
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    return {
      action: 'CREATE_ROLE',
      roleIdentifier: title,
      roleId: slug,
      newRoleData: {
        id: slug,
        title,
        category,
        tags: ['Hybrid'],
        shortDescription: `Role details for ${title}`,
        alternateNames: [],
        technicalSkills: nluIntent.values || [],
        softSkills: [],
        careerLadder: [
          { title: `Junior ${title}`, yearsOfExperience: '0-2 years', salaryRange: '$60k - $80k' },
          { title: `${title}`, yearsOfExperience: '2-5 years', salaryRange: '$80k - $120k' },
          { title: `Senior ${title}`, yearsOfExperience: '5+ years', salaryRange: '$120k - $160k' }
        ],
        scope: `Scope and responsibilities for ${title}`,
        jobMarketProjection: 'Strong growth in tech industry.',
        industry: ['Technology', 'Enterprise']
      },
      summaryText: `Create new role '${title}' under category '${category}'.`,
      requiresConfirmation: true
    };
  }

  // 7. ROLE RESOLUTION FOR DATABASE SKILL & FIELD UPDATES
  const canonicalField = resolveRoleField(nluIntent.field);
  const rawRoleQuery = nluIntent.roleQuery || extractRoleQuery(text, allRoles, conversationHistory);
  const roleQuery = extractRoleQueryFromMessage(rawRoleQuery) || rawRoleQuery;
  const resolution: ResolutionResponse = resolveRoleFromQuery(roleQuery, allRoles);

  // 8. AMBIGUOUS / MULTI-MATCH HANDLING (Requirement 10 & Test 10)
  const isModificationAction = nluIntent.intent === 'ADD_SKILL' || nluIntent.intent === 'UPDATE_ROLE_SKILLS' || nluIntent.intent === 'REMOVE_SKILL' || nluIntent.intent === 'UPDATE_FIELD' || nluIntent.intent === 'DELETE_ROLE';
  if (isModificationAction && resolution.isAmbiguous && resolution.candidates.length > 1) {
    const candidateList = resolution.candidates.map((c, i) => `${i + 1}. **${c.role.title}** (${c.role.category})`).join('\n');
    return {
      action: 'CLARIFY_ROLE',
      candidates: resolution.candidates.map(c => c.role),
      summaryText: `I found multiple matching roles in MongoDB Atlas:\n\n${candidateList}\n\nWhich one do you mean?`,
      requiresConfirmation: false
    };
  }

  // 9. DELETE_ROLE INTENT
  if (nluIntent.intent === 'DELETE_ROLE') {
    const targetRole = resolution.selectedRole;
    if (targetRole) {
      return {
        action: 'DELETE_ROLE',
        roleIdentifier: targetRole.title,
        roleId: targetRole.id,
        targetRole,
        summaryText: `Delete role '${targetRole.title}'`,
        requiresConfirmation: true,
        destructive: true
      };
    }
  }

  // 10. ADD_SKILL / UPDATE_ROLE_SKILLS / REMOVE_SKILL / UPDATE_FIELD
  if (nluIntent.intent === 'ADD_SKILL' || nluIntent.intent === 'UPDATE_ROLE_SKILLS' || nluIntent.intent === 'REMOVE_SKILL' || nluIntent.intent === 'UPDATE_FIELD') {
    const targetRole = resolution.selectedRole;

    if (!targetRole) {
      const topRoles = allRoles.slice(0, 5).map(r => `• **${r.title}**`).join('\n');
      return {
        action: 'NO_ROLE_FOUND',
        summaryText: `I couldn't find a role matching '${roleQuery}' in MongoDB Atlas.\n\nAvailable roles in MongoDB Atlas:\n${topRoles}`,
        requiresConfirmation: false
      };
    }

    const valStr = nluIntent.values.join(', ');
    const { addValues, removeValues } = extractValues(text, targetRole, valStr, nluIntent.intent);

    let salaryUpdate: string | undefined = undefined;
    if (canonicalField === 'salaryRange' || lowerText.includes('salary') || lowerText.includes('lpa')) {
      const salMatch = text.match(/(?:salary|pay|compensation|lpa|k)\s*(?:range|to|of)?\s*(?:is|to)?\s*([\$₹0-9kK\-\sLPA]+)/i);
      if (salMatch) salaryUpdate = salMatch[1].trim();
      else if (valStr) salaryUpdate = valStr;
    }

    const techToAdd = nluIntent.technicalSkills && nluIntent.technicalSkills.length > 0
      ? nluIntent.technicalSkills
      : (canonicalField === 'softSkills' ? [] : addValues);

    const softToAdd = nluIntent.softSkills && nluIntent.softSkills.length > 0
      ? nluIntent.softSkills
      : (canonicalField === 'softSkills' ? addValues : []);

    return {
      action: techToAdd.length > 0 || softToAdd.length > 0 ? 'UPDATE_SKILLS' : 'UPDATE_FIELD',
      roleIdentifier: targetRole.title,
      roleId: targetRole.id,
      targetRole,
      targetField: canonicalField,
      addTechnicalSkills: techToAdd,
      removeTechnicalSkills: removeValues,
      addSoftSkills: softToAdd,
      removeSoftSkills: [],
      updateFields: {
        salaryRange: salaryUpdate
      },
      matchReason: resolution.reason,
      summaryText: `Update skills for **${targetRole.title}** in MongoDB Atlas.`,
      requiresConfirmation: true
    };
  }

  // 11. VIEW / SEARCH ROLE DETAILS
  if (nluIntent.intent === 'VIEW_ROLE' || nluIntent.intent === 'SEARCH_ROLES' || nluIntent.intent === 'LIST_ROLES' || lowerText.startsWith('show') || lowerText.startsWith('list') || lowerText.startsWith('view')) {
    let categoryQuery = '';
    if (lowerText.includes('data') || lowerText.includes('ai') || lowerText.includes('analytics')) categoryQuery = 'Data & Analytics';
    else if (lowerText.includes('software')) categoryQuery = 'Software Development';
    else if (lowerText.includes('cyber')) categoryQuery = 'Cybersecurity';
    else if (lowerText.includes('cloud') || lowerText.includes('devops')) categoryQuery = 'Cloud & DevOps';

    if (categoryQuery || lowerText.includes('all') || lowerText.includes('roles')) {
      let results = allRoles;
      if (categoryQuery) {
        results = results.filter(r => r.category.toLowerCase().includes(categoryQuery.toLowerCase()));
      }
      return {
        action: 'SEARCH_ROLES',
        searchQuery: text,
        searchCategory: categoryQuery,
        summaryText: results.length > 0 ? `Found ${results.length} role(s) under category '${categoryQuery || 'All'}'` : `No roles found matching query`,
        requiresConfirmation: false
      };
    }

    if (resolution.selectedRole) {
      const r = resolution.selectedRole;
      return {
        action: 'SEARCH_ROLES',
        roleIdentifier: r.title,
        roleId: r.id,
        targetRole: r,
        matchReason: resolution.reason,
        summaryText: `Details for '${r.title}'`,
        requiresConfirmation: false
      };
    }
  }

  // 12. UNKNOWN / FALLBACK
  return {
    action: 'UNKNOWN',
    summaryText: `I couldn't identify a specific role or command. Try instructions like:\n• "Add React to Frontend Developer"\n• "Create a new role called AI Product Manager under Management"\n• "Remove Angular from Frontend Developer"\n• "Change DevOps Engineer salary to 12-16 LPA"`,
    requiresConfirmation: false
  };
}

function parseIntentWithNlgSync(text: string, allRoles: ITRole[], history: { role: string; message: string }[]): DetailedIntent {
  const lower = text.toLowerCase().trim();

  // 1. GREETINGS & HELP FIRST
  if (lower === 'hello' || lower === 'hi' || lower === 'hey' || lower === 'greetings') {
    return { intent: 'GENERAL_CONVERSATION', isQuestion: false, values: [], missingInformation: [], needsClarification: false };
  }

  if (lower === 'what can you do?' || lower === 'help' || lower === 'what are your capabilities') {
    return { intent: 'HELP', isQuestion: false, values: [], missingInformation: [], needsClarification: false };
  }

  // Sentence-level question check
  const isQuestion = lower.startsWith('can i') || lower.startsWith('can you') || lower.startsWith('how do') || lower.includes('?') || lower.startsWith('is it possible');

  if (isQuestion && (lower.includes('add a role') || lower.includes('create a role') || lower.includes('add role'))) {
    return {
      intent: 'HELP',
      isQuestion: true,
      clarificationMessage: "Yes, I can create a new role in MongoDB Atlas. What should the role be called and which domain/category does it belong to?",
      values: [],
      missingInformation: [],
      needsClarification: false
    };
  }

  // 2. SEARCH & VIEW INTENTS
  if (lower.startsWith('show') || lower.startsWith('list') || lower.startsWith('view') || lower.startsWith('which') || lower.includes('roles use') || lower.includes('roles under') || lower.includes('how many')) {
    return { intent: 'SEARCH_ROLES', isQuestion: false, values: [], missingInformation: [], needsClarification: false };
  }

  // Role Creation Detection
  const isRoleCreate =
    lower.startsWith('create') ||
    lower.includes('add one role') ||
    lower.includes('add a role') ||
    lower.includes('add a new role') ||
    lower.includes('create a role') ||
    lower.includes('create one role') ||
    lower.includes('create a new role') ||
    lower.includes('add another role') ||
    lower.includes('create another role') ||
    lower.includes('create role') ||
    lower.includes('add role') ||
    (lower.startsWith('add a ') && lower.includes('role')) ||
    (lower.startsWith('create a ') && lower.includes('role'));

  if (isRoleCreate) {
    let category = 'Software Development';
    if (lower.includes('frontend') || lower.includes('front end')) category = 'Software Development';
    else if (lower.includes('cybersecurity')) category = 'Cybersecurity';
    else if (lower.includes('data')) category = 'Data & Analytics';
    else if (lower.includes('management')) category = 'Product & Project Management';

    let roleName: string | null = null;
    const nameMatch = text.match(/(?:create|add|called|name|title)?\s*["']?([A-Za-z0-9\s\-]+?)["']?\s*(?:under|category|in|domain|with|$)/i);
    if (nameMatch && !isQuantityWord(nameMatch[1].trim())) {
      const cand = nameMatch[1].replace(/\b(?:create|add|new|role|called|name|one|a|another|domain|category|in|under)\b/gi, '').trim();
      if (cand.length >= 2 && !isQuantityWord(cand)) {
        roleName = cand;
      }
    }

    const missing = roleName ? [] : ['roleName'];
    return {
      intent: 'CREATE_ROLE',
      isQuestion: false,
      category,
      roleName,
      quantity: 1,
      values: [],
      missingInformation: missing,
      needsClarification: missing.length > 0
    };
  }

  // DUAL SKILL BLOCK PARSING (e.g. "technical: AI-assisted coding, LLMs... Soft: Problem Solving, Communication... add this in vibe coding")
  const hasTechBlock = lower.includes('technical:') || lower.includes('tech:');
  const hasSoftBlock = lower.includes('soft:') || lower.includes('softskills:');

  if (hasTechBlock || hasSoftBlock) {
    const techMatch = text.match(/(?:technical|tech):\s*([\s\S]+?)(?=\s*(?:soft:|softskills:|add this in|add to|in |to |$))/i);
    const softMatch = text.match(/soft:\s*([\s\S]+?)(?=\s*(?:\.\s*add|\.\s*update|add this in|add to|in |to |$))/i);

    const techSkills: string[] = [];
    if (techMatch && techMatch[1]) {
      techMatch[1].split(/,|\n|;/).forEach(v => {
        const clean = v.replace(/\b(?:add|this|in|vibe|coding)\b/gi, ' ').replace(/[\.\,\;\:\n]/g, '').trim();
        if (clean && clean.length >= 2 && !isQuantityWord(clean)) techSkills.push(clean);
      });
    }

    const softSkills: string[] = [];
    if (softMatch && softMatch[1]) {
      softMatch[1].split(/,|\n|;/).forEach(v => {
        const clean = v.replace(/\b(?:add|this|in|vibe|coding)\b/gi, ' ').replace(/[\.\,\;\:\n]/g, '').trim();
        if (clean && clean.length >= 2 && !isQuantityWord(clean)) softSkills.push(clean);
      });
    }

    const extractedRole = extractRoleQueryFromMessage(text);
    const targetRoleRes = resolveRoleFromQuery(extractedRole, allRoles);
    const targetRole = targetRoleRes.selectedRole;

    if (!targetRole) {
      return {
        intent: 'UNKNOWN',
        isQuestion: false,
        roleQuery: extractedRole,
        values: [],
        missingInformation: [],
        needsClarification: true,
        clarificationMessage: `I couldn't find '${extractedRole}' in MongoDB Atlas. Would you like me to create a new role called '${extractedRole}'?`
      };
    }

    return {
      intent: 'ADD_SKILL',
      isQuestion: false,
      roleQuery: targetRole.title,
      field: 'technicalSkills',
      values: techSkills.concat(softSkills),
      missingInformation: [],
      needsClarification: false
    };
  }

  // NATURAL ENGLISH DUAL FIELD EXTRACTION (e.g. "Add React and TS as technical skills and communication as soft skills to Vibe Coding")
  const hasBothTechAndSoft = (lower.includes('technical') || lower.includes('tech')) && lower.includes('soft');
  if (hasBothTechAndSoft) {
    const techPart = text.match(/(?:add|include|put|set)?\s*([A-Za-z0-9\s\,\&]+?)\s+(?:to|as|in)?\s*(?:technical|tech)\s*skills?/i);
    const softPart = text.match(/technical\s*skills?\s*(?:and|also|,)?\s*([A-Za-z0-9\s\,\&]+?)\s+(?:to|as|in)?\s*soft\s*skills?/i) || text.match(/(?:and|also|,)?\s*([A-Za-z0-9\s\,\&]+?)\s+(?:to|as|in)?\s*soft\s*skills?/i);

    const techSkills: string[] = [];
    if (techPart && techPart[1]) {
      techPart[1].split(/,|\band\b|&|;/gi).forEach(v => {
        const clean = v.replace(/(?:to|in|for|under|as)\s+[A-Za-z0-9\s]+$/gi, '').replace(/\b(?:add|put|set|to|as|in|technical|tech|skills|skill|role)\b/gi, ' ').trim();
        if (clean && !isQuantityWord(clean) && clean.length >= 2) techSkills.push(clean);
      });
    }

    const softSkills: string[] = [];
    if (softPart && softPart[1]) {
      softPart[1].split(/,|\band\b|&|;/gi).forEach(v => {
        const rawClean = v.replace(/(?:to|in|for|under|as)\s+[A-Za-z0-9\s]+$/gi, '').replace(/\b(?:add|put|set|to|as|in|soft|skills|skill|and|also|role)\b/gi, ' ').trim();
        const clean = rawClean ? rawClean.charAt(0).toUpperCase() + rawClean.slice(1) : '';
        if (clean && !isQuantityWord(clean) && clean.length >= 2) softSkills.push(clean);
      });
    }

    const extractedRole = extractRoleQueryFromMessage(text);
    return {
      intent: 'UPDATE_ROLE_SKILLS',
      isQuestion: false,
      roleQuery: extractedRole,
      technicalSkills: techSkills,
      softSkills: softSkills,
      values: [...techSkills, ...softSkills],
      missingInformation: [],
      needsClarification: false
    };
  }

  // ADD SKILL vs REMOVE SKILL vs UPDATE
  if (lower.includes('add') || lower.includes('add pannu') || lower.includes('include') || lower.includes('put')) {
    let field = 'technicalSkills';
    if (lower.includes('softskill') || lower.includes('soft skill')) field = 'softSkills';

    const extractedValues: string[] = [];
    const tanglishSkillMatch = text.match(/(?:-la|-ku|-ki)\s+([A-Za-z0-9\.\-\s]+?)\s+(?:add|add pannu|put|include|set)/i);
    const skillBeforeAdd = text.match(/\b([A-Za-z0-9\.\-\s]+?)\s+(?:add|add pannu|put|include)\b/i);
    const skillAfterAdd = text.match(/(?:add|include|put)\s+(.+?)(?=\s+(?:in|to|into|as|under|from|$))/i);

    let rawSkillStr = '';
    if (tanglishSkillMatch && tanglishSkillMatch[1]) {
      rawSkillStr = tanglishSkillMatch[1];
    } else if (lower.includes('add pannu') && skillBeforeAdd) {
      rawSkillStr = skillBeforeAdd[1];
    } else if (skillAfterAdd) {
      rawSkillStr = skillAfterAdd[1];
    } else if (skillBeforeAdd) {
      rawSkillStr = skillBeforeAdd[1];
    }

    if (rawSkillStr) {
      rawSkillStr.split(/,|\band\b|&|;/gi).forEach(v => {
        const clean = v.replace(/\b(?:technical|soft|skills|skill|role|to|in|into|for|from|add|pannu|set)\b/gi, ' ').trim();
        if (clean && !isQuantityWord(clean) && clean.length >= 2) {
          extractedValues.push(clean);
        }
      });
    }

    const extractedRole = extractRoleQueryFromMessage(text);

    return {
      intent: 'ADD_SKILL',
      isQuestion: false,
      roleQuery: extractedRole,
      field,
      values: extractedValues,
      missingInformation: [],
      needsClarification: false
    };
  }

  if (lower.includes('remove') || lower.includes('exclude')) {
    const removeMatch = text.match(/(?:remove|delete|exclude)\s+(.+?)(?=\s+(?:from|in|to|$))/i);
    const rawVal = removeMatch ? removeMatch[1] : '';
    const values: string[] = [];
    if (rawVal) {
      const clean = rawVal.replace(/(?:technical|soft|skills|skill|from|in|to)/gi, '').trim();
      if (clean && !isQuantityWord(clean)) values.push(clean);
    }
    const extractedRole = extractRoleQueryFromMessage(text);
    return {
      intent: 'REMOVE_SKILL',
      isQuestion: false,
      roleQuery: extractedRole,
      field: 'technicalSkills',
      values,
      missingInformation: [],
      needsClarification: false
    };
  }

  if (lower.includes('change') || lower.includes('update') || lower.includes('set') || lower.includes('salary') || lower.includes('lpa')) {
    const salMatch = text.match(/(?:salary|pay|lpa)?\s*(?:to|is|of)?\s*([\$₹0-9kK\-\sLPA]+)/i);
    const extractedRole = extractRoleQueryFromMessage(text);
    return {
      intent: 'UPDATE_FIELD',
      isQuestion: false,
      roleQuery: extractedRole,
      field: 'salaryRange',
      values: salMatch ? [salMatch[1].trim()] : [],
      missingInformation: [],
      needsClarification: false
    };
  }

  return { intent: 'UNKNOWN', isQuestion: false, values: [], missingInformation: [], needsClarification: false };
}

function extractRoleQueryFromMessage(text: string): string {
  const cleanText = text.trim();

  // 1. Explicit phrase match for "in vibe coding", "to frontend developer", "under management"
  const inMatch = cleanText.match(/(?:in|to|into|under|for)\s+["']?([A-Za-z0-9\s\-]+?)["']?\s*(?:role|domain|technical|soft|skills|skill|with|and|\.|$)/i);
  if (inMatch && inMatch[1].trim().length >= 2 && !isQuantityWord(inMatch[1].trim()) && !/^[\$₹0-9\s\-LPA]+$/i.test(inMatch[1].trim())) {
    const cand = inMatch[1].replace(/(?:technical|soft|skills|skill|role|domain|add|this|these)/gi, '').replace(/[\.\,\!\?]+$/g, '').trim();
    if (cand.length >= 2) return cand;
  }

  // 2. Tanglish "-la" / "-ku" / "-ki" pattern (e.g. "Vibe Coding technical skills-la", "Vibe Coding-ku")
  const tanglishMatch = cleanText.match(/^([A-Za-z0-9\s\-]+?)\s+(?:technical|soft|skills|skill)?\s*(?:-la|-ku|-ki)\b/i) || cleanText.match(/^([A-Za-z0-9\s\-]+?)(?:-la|-ku|-ki)\b/i);
  if (tanglishMatch && tanglishMatch[1].trim().length >= 2) {
    const cand = tanglishMatch[1].replace(/(?:technical|soft|skills|skill|role)/gi, '').replace(/[\.\,\!\?]+$/g, '').trim();
    if (cand.length >= 2 && !isQuantityWord(cand)) return cand;
  }

  // 3. Phrase before "role update" / "role change" (e.g. "Vibe Coding role update pannu")
  const roleBeforeUpdate = cleanText.match(/^([A-Za-z0-9\s\-]+?)\s+(?:role\s+)?(?:update|change|set)\b/i);
  if (roleBeforeUpdate && roleBeforeUpdate[1].trim().length >= 2) {
    const cand = roleBeforeUpdate[1].replace(/(?:technical|soft|skills|skill|role|domain|add|this|these)/gi, '').replace(/[\.\,\!\?]+$/g, '').trim();
    if (cand.length >= 2 && !isQuantityWord(cand)) return cand;
  }

  const updateMatch = cleanText.match(/(?:update|change|show|view|delete)\s+["']?([A-Za-z0-9\s\-]+?)["']?\s*(?:role|technical|soft|skills|salary|with|$)/i);
  if (updateMatch && updateMatch[1].trim().length >= 2) {
    const cand = updateMatch[1].replace(/(?:technical|soft|skills|salary|role|roleName)/gi, '').replace(/[\.\,\!\?]+$/g, '').trim();
    if (cand.length >= 2) return cand;
  }

  return cleanText
    .replace(/\b(?:add|remove|delete|change|update|modify|edit|put|set|include|exclude|in|to|from|into|for|under|as|softskills|soft skills|technical skills|tech skills|skills|skill|salary|pay|compensation|lpa|range|technical:|soft:)\b/gi, ' ')
    .replace(/[\$₹0-9\-LPA\.\,\!\?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRoleQuery(text: string, allRoles: ITRole[], history: { role: string; message: string }[]): string {
  const directMatch = resolveRoleFromQuery(text, allRoles);
  if (directMatch.selectedRole) return directMatch.selectedRole.id;

  let clean = text
    .replace(/(?:add|remove|delete|change|update|modify|edit|put|set|include|exclude|in|to|from|into|for|under|as|softskills|soft skills|technical skills|tech skills|skills|skill|salary|pay|compensation|lpa|range)/gi, ' ')
    .replace(/[\$₹0-9\-LPA]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length >= 2) return clean;

  for (let i = history.length - 1; i >= 0; i--) {
    const histMsg = history[i].message;
    const res = resolveRoleFromQuery(histMsg, allRoles);
    if (res.selectedRole) return res.selectedRole.id;
  }

  return text;
}

function extractValues(text: string, role: ITRole, nlgValue: string, intent: string): { addValues: string[]; removeValues: string[] } {
  const addValues: string[] = [];
  const removeValues: string[] = [];

  if (nlgValue && intent === 'ADD_SKILL') {
    nlgValue.split(/[\n,;&]+/).forEach(v => {
      const norm = normalizeValue(v);
      if (norm.length >= 2 && norm.length <= 40 && !isQuantityWord(norm)) addValues.push(norm);
    });
  } else if (nlgValue && intent === 'REMOVE_SKILL') {
    nlgValue.split(/[\n,;&]+/).forEach(v => {
      const norm = normalizeValue(v);
      if (norm.length >= 2 && norm.length <= 40 && !isQuantityWord(norm)) removeValues.push(norm);
    });
  } else {
    const addMatch = text.match(/add\s+(.+?)(?=\s+(?:in|to|into|as|under|from|$))/i);
    if (addMatch) {
      const clean = addMatch[1].replace(/(?:technical|soft|skills|skill|softskills|softskill|role|to|in|into|for|from|and)/gi, ' ').trim();
      if (clean && !isQuantityWord(clean)) {
        clean.split(/[\n,;&]+/).forEach(v => {
          const norm = normalizeValue(v);
          if (norm.length >= 2 && norm.length <= 40 && !isQuantityWord(norm)) addValues.push(norm);
        });
      }
    }

    const removeMatch = text.match(/(?:remove|delete|exclude)\s+(.+?)(?=\s+(?:from|in|to|$))/i);
    if (removeMatch) {
      const clean = removeMatch[1].replace(/(?:technical|soft|skills|skill|from|in|to)/gi, '').trim();
      if (clean && !isQuantityWord(clean)) {
        clean.split(/[\n,;&]+/).forEach(v => {
          const norm = normalizeValue(v);
          if (norm.length >= 2 && norm.length <= 40 && !isQuantityWord(norm)) removeValues.push(norm);
        });
      }
    }
  }

  return {
    addValues: Array.from(new Set(addValues)),
    removeValues: Array.from(new Set(removeValues))
  };
}

function extractCategoryFromHistory(history: { role: string; message: string }[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i].message.toLowerCase();
    if (msg.includes('frontend') || msg.includes('front end')) return 'Software Development';
    if (msg.includes('cybersecurity')) return 'Cybersecurity';
    if (msg.includes('data')) return 'Data & Analytics';
    if (msg.includes('management')) return 'Product & Project Management';
  }
  return null;
}

function isQuantityWord(str: string): boolean {
  if (!str) return true;
  const clean = str.trim().toLowerCase();
  const QUANTITY_WORDS = ['one', 'two', 'three', 'a', 'an', 'another', 'new', 'one more', 'another one', '1', '2', '3'];
  return QUANTITY_WORDS.includes(clean);
}
