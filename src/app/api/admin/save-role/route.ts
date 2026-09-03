import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type Body = {
  id: string;
  technical: string[];
  soft: string[];
};

async function updateRoleInFile(filePath: string, roleId: string, technical: string[], soft: string[]) {
  let content = await fs.readFile(filePath, 'utf-8');

  // find the position of id: 'roleId' (either single or double quotes)
  const idPattern = new RegExp("id\s*:\s*['\"]" + roleId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + "['\"]");
  const idMatch = content.match(idPattern);
  if (!idMatch) throw new Error(`role id '${roleId}' not found in ${filePath}`);

  const idIndex = idMatch.index!;
  // find the opening brace of the object by scanning backwards
  let objStart = content.lastIndexOf('{', idIndex);
  if (objStart === -1) throw new Error('object start not found');

  // find the matching closing brace
  let pos = objStart;
  let depth = 0;
  let objEnd = -1;
  while (pos < content.length) {
    const ch = content[pos];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { objEnd = pos; break; }
    }
    pos++;
  }
  if (objEnd === -1) throw new Error('object end not found');

  const objText = content.slice(objStart, objEnd + 1);

  // replace or insert technicalSkills and softSkills
  const techArrayText = '[' + technical.map(s => JSON.stringify(s)).join(', ') + ']';
  const softArrayText = '[' + soft.map(s => JSON.stringify(s)).join(', ') + ']';

  let newObjText = objText;

  if (/technicalSkills\s*:\s*\[([\s\S]*?)\]/.test(newObjText)) {
    newObjText = newObjText.replace(/technicalSkills\s*:\s*\[[\s\S]*?\](,?)/, `technicalSkills: ${techArrayText}$1`);
  } else {
    // insert before softSkills if present, else before last brace
    if (/softSkills\s*:\s*\[/.test(newObjText)) {
      newObjText = newObjText.replace(/(softSkills\s*:\s*\[)/, `technicalSkills: ${techArrayText},\n  $1`);
    } else {
      newObjText = newObjText.replace(/\n\s*\}/, `\n  technicalSkills: ${techArrayText},\n}`);
    }
  }

  if (/softSkills\s*:\s*\[([\s\S]*?)\]/.test(newObjText)) {
    newObjText = newObjText.replace(/softSkills\s*:\s*\[[\s\S]*?\](,?)/, `softSkills: ${softArrayText}$1`);
  } else {
    newObjText = newObjText.replace(/\n\s*\}/, `\n  softSkills: ${softArrayText},\n}`);
  }

  const newContent = content.slice(0, objStart) + newObjText + content.slice(objEnd + 1);
  await fs.writeFile(filePath, newContent, 'utf-8');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

    const filePath = path.join(process.cwd(), 'src', 'data', 'itRoles.ts');
    await updateRoleInFile(filePath, body.id, body.technical || [], body.soft || []);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
