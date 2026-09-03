/**
 * Rebuilt NLG + LLM Intent Understanding Engine
 *
 * Implements full sentence-level Natural Language Understanding (NLU):
 *  - Distinguishes CREATE_ROLE ("add one role in frontend") from ADD_SKILL ("add React to frontend")
 *  - Filters quantity & article words ("one", "a", "another", "new") from skill extractions
 *  - Detects questions ("can I add a role?") without triggering database writes
 *  - Supports strict Zod schema validation
 */

import { z } from 'zod';

export const DetailedIntentSchema = z.object({
  intent: z.enum([
    'CREATE_ROLE',
    'UPDATE_ROLE',
    'UPDATE_ROLE_SKILLS',
    'DELETE_ROLE',
    'ADD_SKILL',
    'REMOVE_SKILL',
    'UPDATE_FIELD',
    'VIEW_ROLE',
    'LIST_ROLES',
    'SEARCH_ROLES',
    'COUNT_ROLES',
    'COMPARE_ROLES',
    'GENERAL_CONVERSATION',
    'HELP',
    'CONFIRM',
    'CANCEL',
    'UNDO',
    'CLARIFICATION',
    'UNKNOWN'
  ]),
  isQuestion: z.boolean().default(false),
  roleQuery: z.string().nullable().optional(),
  roleName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  field: z.string().nullable().optional(),
  technicalSkills: z.array(z.string()).optional(),
  softSkills: z.array(z.string()).optional(),
  values: z.array(z.string()).default([]),
  quantity: z.number().nullable().optional(),
  missingInformation: z.array(z.string()).default([]),
  needsClarification: z.boolean().default(false),
  clarificationMessage: z.string().nullable().optional()
});

export type DetailedIntent = z.infer<typeof DetailedIntentSchema>;

export const GEMINI_TOOL_DECLARATIONS = {
  functionDeclarations: [
    {
      name: 'updateRoleSkills',
      description: 'Update technical skills and/or soft skills on an existing IT role in MongoDB Atlas.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleQuery: { type: 'STRING', description: 'Target role title or alias (e.g. Vibe Coding, Frontend Developer)' },
          technicalSkills: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Array of technical skills to add' },
          softSkills: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Array of soft skills to add' }
        },
        required: ['roleQuery']
      }
    },
    {
      name: 'createRole',
      description: 'Create a new IT role in MongoDB Atlas.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleName: { type: 'STRING', description: 'Title of the new role (e.g. AI Product Manager)' },
          category: { type: 'STRING', description: 'Category or domain (e.g. Management, Software Development)' },
          technicalSkills: { type: 'ARRAY', items: { type: 'STRING' } },
          softSkills: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['category']
      }
    },
    {
      name: 'addTechnicalSkill',
      description: 'Add technical skill(s) to an existing role in MongoDB Atlas.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleQuery: { type: 'STRING', description: 'Target role title or alias (e.g. Frontend Developer)' },
          skill: { type: 'STRING', description: 'Skill to add (e.g. Codex, React)' }
        },
        required: ['roleQuery', 'skill']
      }
    },
    {
      name: 'removeTechnicalSkill',
      description: 'Remove a technical skill from a role.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleQuery: { type: 'STRING' },
          skill: { type: 'STRING' }
        },
        required: ['roleQuery', 'skill']
      }
    },
    {
      name: 'addSoftSkill',
      description: 'Add soft skill(s) to a role.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleQuery: { type: 'STRING' },
          skill: { type: 'STRING' }
        },
        required: ['roleQuery', 'skill']
      }
    },
    {
      name: 'removeSoftSkill',
      description: 'Remove a soft skill from a role.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleQuery: { type: 'STRING' },
          skill: { type: 'STRING' }
        },
        required: ['roleQuery', 'skill']
      }
    },
    {
      name: 'updateRoleField',
      description: 'Update a specific allowed field (salary, description, etc.) on a role.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleQuery: { type: 'STRING' },
          field: { type: 'STRING', description: 'Field to update (salary, description, etc.)' },
          value: { type: 'STRING', description: 'New value for the field' }
        },
        required: ['roleQuery', 'field', 'value']
      }
    },
    {
      name: 'deleteRole',
      description: 'Delete a role from MongoDB Atlas (requires admin confirmation).',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleQuery: { type: 'STRING' }
        },
        required: ['roleQuery']
      }
    },
    {
      name: 'getRole',
      description: 'Retrieve stored details for a specific role.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleQuery: { type: 'STRING' }
        },
        required: ['roleQuery']
      }
    },
    {
      name: 'searchRoles',
      description: 'Search roles matching a text query, category, or skills.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING' },
          category: { type: 'STRING' }
        }
      }
    },
    {
      name: 'listRoles',
      description: 'List roles in a category or domain.',
      parameters: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING' }
        }
      }
    },
    {
      name: 'countRoles',
      description: 'Count total roles in database or specific category.',
      parameters: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING' }
        }
      }
    },
    {
      name: 'compareRoles',
      description: 'Compare multiple roles side-by-side.',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleQueries: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['roleQueries']
      }
    }
  ]
};

const SYSTEM_PROMPT = `You are the AI Data Administrator for IT Career Hub.

Your job is to understand administrator instructions, identify the intended operation, and request the correct backend tool to read or modify the IT Career Hub data stored in MongoDB Atlas.

You are NOT the database itself.

You must NEVER directly execute MongoDB commands, generate arbitrary MongoDB queries, or modify the database without using the approved backend tools.

The backend is responsible for all actual MongoDB operations.

============================================================
CORE OBJECTIVE
============================================================

Convert administrator natural-language instructions into a precise, validated operation.

The complete pipeline is:

ADMIN INPUT -> UNDERSTAND INTENT -> EXTRACT TARGET ROLE -> EXTRACT FIELDS / VALUES -> VALIDATE -> RESOLVE ROLE USING BACKEND -> SHOW PREVIEW -> ADMIN CONFIRMATION -> CALL APPROVED BACKEND TOOL -> MONGODB ATLAS UPDATE -> VERIFY DATABASE UPDATE -> REVALIDATE NEXT.JS DATA -> FRONTEND DISPLAYS UPDATED DATA

MongoDB Atlas is the source of truth.

============================================================
MOST IMPORTANT RULE
============================================================

NEVER determine the target role from individual words in the user's message.
First identify the COMPLETE target role.

Example:
User: "Add AI-assisted coding, Prompt Engineering and LLMs to Vibe Coding"
Correct: roleQuery = "Vibe Coding"
Incorrect: roleQuery = "coding", "AI", "LLM", "Data Engineer"

The complete role name always has priority.

============================================================
ROLE EXTRACTION & RESOLUTION
============================================================

Extract the target role separately from requested changes.
Pass ONLY roleQuery to the backend role resolver.

Priority:
1. Exact role ID
2. Exact slug
3. Exact role title
4. Case-insensitive exact title
5. Normalized title
6. Exact alias
7. Normalized alias
8. Fuzzy matching only as a final fallback

If an exact match exists, never return unrelated roles.

============================================================
MULTIPLE MATCHES & AMBIGUITY
============================================================

Do NOT show multiple roles merely because words from the user's message appear in multiple roles.
Only ask for clarification if the actual role reference is genuinely ambiguous (e.g. "Add Python to Developer").
"Add Python to Vibe Coding" is NOT ambiguous.

============================================================
INTENTS & FIELDS
============================================================

Recognize these operations:
GET_ROLE, LIST_ROLES, SEARCH_ROLES, ADD_SKILL, REMOVE_SKILL, UPDATE_ROLE, UPDATE_ROLE_SKILLS, CREATE_ROLE, DELETE_ROLE, UNKNOWN.

A single user message may contain both technicalSkills and softSkills:
"technical: React, TS. soft: Communication. add this to Vibe Coding"
Interpret as:
intent = UPDATE_ROLE_SKILLS
roleQuery = "Vibe Coding"
technicalSkills = ["React", "TS"]
softSkills = ["Communication"]

============================================================
NATURAL LANGUAGE & TANGLISH
============================================================

Understand English and Tamil-English mixed instructions:
- "Vibe Coding-ku React add pannu" -> roleQuery = "Vibe Coding", technicalSkills = ["React"]
- "Frontend Developer-la TypeScript add pannu" -> roleQuery = "Frontend Developer", technicalSkills = ["TypeScript"]
- "DevOps Engineer technical skills-la Docker add pannu" -> roleQuery = "DevOps Engineer", technicalSkills = ["Docker"]
- "Vibe Coding soft skills-la communication add pannu" -> roleQuery = "Vibe Coding", softSkills = ["Communication"]
- "Vibe Coding role update pannu" -> roleQuery = "Vibe Coding"

Output strict JSON matching the schema ONLY.`;

/**
 * Main NLU Intent Understanding Engine Entry Point
 */
export async function parseDetailedIntentWithNlg(message: string): Promise<DetailedIntent> {
  const text = message.trim();
  if (!text) {
    return {
      intent: 'UNKNOWN',
      isQuestion: false,
      roleQuery: null,
      roleName: null,
      category: null,
      field: null,
      values: [],
      quantity: null,
      missingInformation: [],
      needsClarification: false
    };
  }

  // 1. TRY GEMINI API IF API KEY EXISTS
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const result = await callGeminiDetailed(text, geminiKey);
      if (result) return sanitizeExtractedIntent(result, text);
    } catch (err) {
      console.warn('[NLGEngine] Gemini call failed, using local NLU engine:', err);
    }
  }

  // 2. TRY OPENAI API IF API KEY EXISTS
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const result = await callOpenAiDetailed(text, openAiKey);
      if (result) return sanitizeExtractedIntent(result, text);
    } catch (err) {
      console.warn('[NLGEngine] OpenAI call failed, using local NLU engine:', err);
    }
  }

  // 3. DETERMINISTIC LOCAL NLU ENGINE (100% Offline & Reliable)
  const localIntent = parseDetailedIntentLocally(text);
  return sanitizeExtractedIntent(localIntent, text);
}

/**
 * Local Deterministic NLU Engine implementing sentence-level classification
 */
function parseDetailedIntentLocally(text: string): DetailedIntent {
  const lower = text.toLowerCase().trim();

  // Detect Questions ("can I...", "how do I...", "what is...")
  const isQuestion = lower.startsWith('can i') || lower.startsWith('can you') || lower.startsWith('how do') || lower.includes('?') || lower.startsWith('is it possible');

  // 1. GENERAL CONVERSATION & HELP
  if (lower === 'hello' || lower === 'hi' || lower === 'hey' || lower === 'greetings') {
    return {
      intent: 'GENERAL_CONVERSATION',
      isQuestion: false,
      values: [],
      missingInformation: [],
      needsClarification: false
    };
  }

  if (lower === 'what can you do?' || lower === 'help' || lower === 'what are your capabilities') {
    return {
      intent: 'HELP',
      isQuestion: false,
      values: [],
      missingInformation: [],
      needsClarification: false
    };
  }

  if (lower === 'yes' || lower === 'confirm' || lower === 'do it' || lower === 'apply it') {
    return {
      intent: 'CONFIRM',
      isQuestion: false,
      values: [],
      missingInformation: [],
      needsClarification: false
    };
  }

  // 2. QUESTION HANDLING (e.g. "Can I add a role?")
  if (isQuestion) {
    if (lower.includes('add a role') || lower.includes('create a role') || lower.includes('add role') || lower.includes('create role')) {
      return {
        intent: 'HELP',
        isQuestion: true,
        clarificationMessage: "Yes, I can create a new role in MongoDB Atlas. What should the role be called and which category/domain does it belong to?",
        values: [],
        missingInformation: [],
        needsClarification: false
      };
    }
  }

  // 3. CREATE_ROLE vs ADD_SKILL CLASSIFICATION
  const isRoleCreationPhrase =
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

  if (isRoleCreationPhrase) {
    // Extract Category (e.g. "in frontend domain", "under cybersecurity")
    let category: string | null = null;
    if (lower.includes('frontend') || lower.includes('front end') || lower.includes('front-end')) category = 'Software Development';
    else if (lower.includes('backend') || lower.includes('back end')) category = 'Software Development';
    else if (lower.includes('fullstack') || lower.includes('full stack')) category = 'Software Development';
    else if (lower.includes('cybersecurity') || lower.includes('security')) category = 'Cybersecurity';
    else if (lower.includes('data science') || lower.includes('data') || lower.includes('ai')) category = 'Data & Analytics';
    else if (lower.includes('management')) category = 'Product & Project Management';

    // Check if user specified exact role name (e.g. "create a new role called AI Product Manager under Management")
    let roleName: string | null = null;
    const nameMatch = text.match(/(?:called|name|title)?\s*["']?([A-Za-z0-9\s\-]+?)["']?\s*(?:under|category|in|domain|with|$)/i);
    if (nameMatch && !isQuantityWord(nameMatch[1].trim())) {
      const cand = nameMatch[1].replace(/\b(?:create|add|new|role|called|name|one|a|another|domain|category|in|under)\b/gi, '').trim();
      if (cand.length >= 2 && !isQuantityWord(cand)) {
        roleName = cand;
      }
    }

    const missingInfo: string[] = [];
    if (!roleName) missingInfo.push('roleName');

    return {
      intent: 'CREATE_ROLE',
      isQuestion: false,
      category,
      roleName,
      quantity: 1,
      values: [],
      missingInformation: missingInfo,
      needsClarification: missingInfo.length > 0
    };
  }

  // 4. DELETE ROLE INTENT
  if (lower.startsWith('delete role') || lower.includes('delete a role') || lower.includes('remove role')) {
    const roleQuery = text.replace(/(?:delete|remove|role|archived)/gi, '').trim();
    return {
      intent: 'DELETE_ROLE',
      isQuestion: false,
      roleQuery,
      values: [],
      missingInformation: roleQuery ? [] : ['roleQuery'],
      needsClarification: !roleQuery
    };
  }

  // 5. ADD_SKILL INTENT
  if (lower.startsWith('add') || lower.includes('include') || lower.includes('put') || lower.includes('needs')) {
    let field = 'technicalSkills';
    if (lower.includes('softskill') || lower.includes('soft skill')) field = 'softSkills';

    const addMatch = text.match(/(?:add|include|put)\s+(.+?)(?=\s+(?:in|to|into|as|under|from|$))/i);
    const rawVal = addMatch ? addMatch[1] : '';

    const extractedValues: string[] = [];
    if (rawVal) {
      rawVal.split(/[\n,;&]+/).forEach(v => {
        const clean = v.replace(/(?:technical|soft|skills|skill|role|to|in|into|for|from|and)/gi, '').trim();
        if (clean && !isQuantityWord(clean) && clean.length >= 2) {
          extractedValues.push(clean);
        }
      });
    }

    let roleQuery = text
      .replace(/(?:add|include|put|to|in|into|for|technical|soft|skills|skill|softskills|softskill)/gi, ' ')
      .replace(new RegExp(extractedValues.join('|'), 'gi'), ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      intent: 'ADD_SKILL',
      isQuestion: false,
      roleQuery: roleQuery || null,
      field,
      values: extractedValues,
      missingInformation: extractedValues.length === 0 ? ['values'] : !roleQuery ? ['roleQuery'] : [],
      needsClarification: extractedValues.length === 0 || !roleQuery
    };
  }

  // 6. REMOVE_SKILL INTENT
  if (lower.startsWith('remove') || lower.includes('exclude')) {
    const removeMatch = text.match(/(?:remove|delete|exclude)\s+(.+?)(?=\s+(?:from|in|to|$))/i);
    const rawVal = removeMatch ? removeMatch[1] : '';

    const extractedValues: string[] = [];
    if (rawVal) {
      const clean = rawVal.replace(/(?:technical|soft|skills|skill|from|in|to)/gi, '').trim();
      if (clean && !isQuantityWord(clean)) extractedValues.push(clean);
    }

    return {
      intent: 'REMOVE_SKILL',
      isQuestion: false,
      roleQuery: text.replace(/(?:remove|from|technical|soft|skills|skill)/gi, '').trim(),
      field: 'technicalSkills',
      values: extractedValues,
      missingInformation: [],
      needsClarification: false
    };
  }

  // 7. UPDATE_FIELD INTENT (e.g. Salary, Description)
  if (lower.startsWith('change') || lower.startsWith('update') || lower.startsWith('set')) {
    let field = 'salaryRange';
    let val = '';
    const salMatch = text.match(/(?:salary|pay|lpa)?\s*(?:to|is|of)?\s*([\$₹0-9kK\-\sLPA]+)/i);
    if (salMatch) val = salMatch[1].trim();

    return {
      intent: 'UPDATE_FIELD',
      isQuestion: false,
      roleQuery: text.replace(/(?:change|update|set|salary|to|is|of|pay|lpa)/gi, '').trim(),
      field,
      values: val ? [val] : [],
      missingInformation: [],
      needsClarification: false
    };
  }

  // 8. VIEW / SEARCH INTENT
  if (lower.startsWith('show') || lower.startsWith('list') || lower.startsWith('view') || lower.includes('roles under')) {
    return {
      intent: 'SEARCH_ROLES',
      isQuestion: false,
      roleQuery: text.replace(/(?:show|list|view|all|roles|under|in)/gi, '').trim(),
      values: [],
      missingInformation: [],
      needsClarification: false
    };
  }

  return {
    intent: 'UNKNOWN',
    isQuestion,
    values: [],
    missingInformation: [],
    needsClarification: false
  };
}

/**
 * Ensures quantity/article words ("one", "a", "an", "another") are NEVER returned as skill values.
 */
function sanitizeExtractedIntent(intent: DetailedIntent, rawMessage: string): DetailedIntent {
  const sanitizedValues = (intent.values || []).filter(v => !isQuantityWord(v));

  // If intent was ADD_SKILL but values were only quantity words like "one", switch intent to CREATE_ROLE!
  const lowerMsg = rawMessage.toLowerCase();
  const containsRoleCreateWords = lowerMsg.includes('add one role') || lowerMsg.includes('add a role') || lowerMsg.includes('create a role');

  if (containsRoleCreateWords || (intent.intent === 'ADD_SKILL' && sanitizedValues.length === 0 && intent.values.some(isQuantityWord))) {
    return {
      ...intent,
      intent: 'CREATE_ROLE',
      values: [],
      missingInformation: intent.roleName ? [] : ['roleName'],
      needsClarification: !intent.roleName
    };
  }

  return {
    ...intent,
    values: sanitizedValues
  };
}

function isQuantityWord(str: string): boolean {
  if (!str) return true;
  const clean = str.trim().toLowerCase();
  const QUANTITY_WORDS = ['one', 'two', 'three', 'a', 'an', 'another', 'new', 'one more', 'another one', '1', '2', '3'];
  return QUANTITY_WORDS.includes(clean);
}

async function callGeminiDetailed(prompt: string, apiKey: string): Promise<DetailedIntent | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: SYSTEM_PROMPT },
          { text: `User request: ${prompt}` }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  try {
    const clean = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);
    return DetailedIntentSchema.parse(parsed);
  } catch {
    return null;
  }
}

async function callOpenAiDetailed(prompt: string, apiKey: string): Promise<DetailedIntent | null> {
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content;
  if (!rawText) return null;

  try {
    const clean = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);
    return DetailedIntentSchema.parse(parsed);
  } catch {
    return null;
  }
}
