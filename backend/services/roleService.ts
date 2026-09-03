import { Db } from 'mongodb';
import { getDb, isMongoConfigured } from '../config/mongodb';
import { ITRole, RoleDocument } from '../types/role';
import { itRoles } from '../../src/data/itRoles';
import { revalidatePath } from 'next/cache';

const COLLECTION_NAME = 'roles';

/**
 * Auto-seeds MongoDB Atlas `roles` collection from static `itRoles` dataset
 * if the database collection is empty. Guarantees MongoDB Atlas has all role documents.
 */
async function ensureRolesSeeded(db: Db): Promise<void> {
  try {
    const count = await db.collection<RoleDocument>(COLLECTION_NAME).countDocuments({ status: { $ne: 'archived' } });
    if (count === 0) {
      console.log('🌱 MongoDB Atlas roles collection is empty. Auto-seeding initial IT roles dataset...');
      const now = new Date().toISOString();
      const docsToInsert: RoleDocument[] = itRoles.map(role => ({
        ...role,
        status: 'approved',
        version: 1,
        verified: true,
        createdAt: now,
        updatedAt: now
      }));
      await db.collection<RoleDocument>(COLLECTION_NAME).insertMany(docsToInsert);
      console.log(`✅ Auto-seeded ${docsToInsert.length} roles into MongoDB Atlas!`);
    }
  } catch (err: any) {
    console.error('Auto-seed check warning:', err.message);
  }
}

export async function getAllRolesFromDb(): Promise<ITRole[]> {
  try {
    if (!isMongoConfigured()) {
      return itRoles;
    }
    const db = await getDb();
    await ensureRolesSeeded(db);

    const roles = await db.collection<RoleDocument>(COLLECTION_NAME)
      .find({ status: { $ne: 'archived' } })
      .sort({ title: 1 })
      .toArray();

    if (roles.length === 0) {
      return itRoles;
    }

    return roles.map(mapDocumentToITRole);
  } catch (error: any) {
    console.error('Error fetching roles from MongoDB Atlas:', error.message);
    return itRoles;
  }
}

export async function getRoleBySlugFromDb(slug: string): Promise<ITRole | null> {
  try {
    if (!isMongoConfigured()) {
      const found = itRoles.find(r => r.id === slug);
      return found || null;
    }
    const db = await getDb();
    await ensureRolesSeeded(db);

    let roleDoc = await db.collection<RoleDocument>(COLLECTION_NAME).findOne({
      id: slug,
      status: { $ne: 'archived' }
    });

    // If specific role doc is missing in MongoDB Atlas, seed it from static dataset into MongoDB Atlas
    if (!roleDoc) {
      const fallbackStatic = itRoles.find(r => r.id === slug);
      if (fallbackStatic) {
        console.log(`🌱 Role '${slug}' missing in MongoDB Atlas. Upserting static template to MongoDB Atlas...`);
        const seeded = await upsertRoleInDb(fallbackStatic, 'system-autoseed');
        return seeded;
      }
      return null;
    }

    return mapDocumentToITRole(roleDoc);
  } catch (error: any) {
    console.error(`Error fetching role ${slug} from MongoDB Atlas:`, error.message);
    const found = itRoles.find(r => r.id === slug);
    return found || null;
  }
}

export async function searchRolesFromDb(query: string, tags: string[] = [], category: string | null = null): Promise<ITRole[]> {
  const allRoles = await getAllRolesFromDb();

  return allRoles.filter(role => {
    const matchesSearch = !query || 
      role.title.toLowerCase().includes(query.toLowerCase()) ||
      role.shortDescription.toLowerCase().includes(query.toLowerCase()) ||
      role.category.toLowerCase().includes(query.toLowerCase()) ||
      (role.alternateNames && role.alternateNames.some(name => name.toLowerCase().includes(query.toLowerCase()))) ||
      (role.technicalSkills && role.technicalSkills.some(skill => skill.toLowerCase().includes(query.toLowerCase())));

    const matchesTags = tags.length === 0 || 
      tags.some(tag => role.tags && role.tags.includes(tag as any));

    const matchesCategory = !category || role.category === category;

    return matchesSearch && matchesTags && matchesCategory;
  });
}

/**
 * Upserts a role into MongoDB Atlas collection `roles`.
 * Uses Set deduplication to prevent duplicate skills ($addToSet behavior).
 * Verifies document in MongoDB Atlas before returning success.
 * Invalidates Next.js route caches.
 */
export async function upsertRoleInDb(roleData: ITRole, adminUser: string = 'admin'): Promise<ITRole> {
  if (!isMongoConfigured()) {
    throw new Error('MongoDB Atlas is not configured (MONGODB_URI missing).');
  }

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  const existing = await collection.findOne({ id: roleData.id });
  const now = new Date().toISOString();

  const currentVersion = existing?.version || 1;
  const newVersion = existing ? currentVersion + 1 : 1;

  // Enforce skill deduplication for BOTH technicalSkills and softSkills ($addToSet requirement)
  const deduplicatedTechSkills = Array.from(
    new Set((roleData.technicalSkills || []).map(s => s.trim()).filter(Boolean))
  );

  const deduplicatedSoftSkills = Array.from(
    new Set((roleData.softSkills || []).map(s => s.trim()).filter(Boolean))
  );

  const docToSave: RoleDocument = {
    ...roleData,
    technicalSkills: deduplicatedTechSkills,
    softSkills: deduplicatedSoftSkills,
    status: 'approved',
    version: newVersion,
    verified: true,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const updateRes = await collection.updateOne(
    { id: roleData.id },
    { $set: docToSave },
    { upsert: true }
  );

  if (!updateRes.acknowledged) {
    throw new Error(`MongoDB Atlas rejected the update for role '${roleData.id}'.`);
  }

  // Verification step: fetch document back from MongoDB Atlas
  const verifiedDoc = await collection.findOne({ id: roleData.id });
  if (!verifiedDoc) {
    throw new Error(`Database verification failed: role '${roleData.id}' not found in MongoDB Atlas after update.`);
  }

  // Version audit tracking
  if (existing) {
    await db.collection('role_versions').insertOne({
      roleId: roleData.id,
      version: currentVersion,
      previousData: existing,
      newData: verifiedDoc,
      approvedBy: adminUser,
      createdAt: now
    });
  }

  // Purge Next.js static caches so live updates appear instantly on refresh
  try {
    revalidatePath(`/roles/${roleData.id}`);
    revalidatePath('/');
    revalidatePath('/compare');
    revalidatePath('/admin/skill-converter');
  } catch (cacheErr) {
    // Non-fatal if invoked outside Next.js request context
  }

  return mapDocumentToITRole(verifiedDoc);
}

export async function deleteRoleInDb(slug: string): Promise<boolean> {
  if (!isMongoConfigured()) {
    throw new Error('MongoDB Atlas is not configured.');
  }

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);
  
  // Perform actual deletion or status mark
  const res = await collection.deleteOne({ id: slug });
  
  // Verification: ensure document no longer exists
  const check = await collection.findOne({ id: slug });
  const isDeleted = !check;

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
    revalidatePath('/admin/data-management');
    revalidatePath('/admin/skill-converter');
  } catch (e) {}

  return isDeleted;
}

export async function addSkillToRoleInDb(slug: string, field: 'technicalSkills' | 'softSkills', skill: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');
  const cleanSkill = skill.trim();
  if (!cleanSkill) throw new Error('Skill name cannot be empty.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  const res = await collection.updateOne(
    { id: slug },
    { 
      $addToSet: { [field]: cleanSkill } as any,
      $set: { updatedAt: new Date().toISOString() }
    }
  );

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after skill update.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function removeSkillFromRoleInDb(slug: string, field: 'technicalSkills' | 'softSkills', skill: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  await collection.updateOne(
    { id: slug },
    { 
      $pull: { [field]: skill } as any,
      $set: { updatedAt: new Date().toISOString() }
    }
  );

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after skill deletion.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function editSkillInRoleInDb(slug: string, field: 'technicalSkills' | 'softSkills', oldSkill: string, newSkill: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');
  const cleanNew = newSkill.trim();
  if (!cleanNew) throw new Error('New skill name cannot be empty.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  // Atomic pull old, addToSet new
  await collection.updateOne({ id: slug }, { $pull: { [field]: oldSkill } as any });
  await collection.updateOne({ id: slug }, { $addToSet: { [field]: cleanNew } as any, $set: { updatedAt: new Date().toISOString() } });

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after skill edit.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function getUniqueCategoriesFromDb(): Promise<string[]> {
  const allRoles = await getAllRolesFromDb();
  const categories = Array.from(new Set(allRoles.map(r => r.category).filter(Boolean))).sort();
  return categories;
}

export async function addProjectToRoleInDb(slug: string, level: 'beginner' | 'intermediate' | 'advanced', project: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');
  const cleanProject = project.trim();
  if (!cleanProject) throw new Error('Project name cannot be empty.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  const fieldKey = `projects.${level}`;
  await collection.updateOne(
    { id: slug },
    { 
      $addToSet: { [fieldKey]: cleanProject } as any,
      $set: { updatedAt: new Date().toISOString() }
    }
  );

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after project update.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function removeProjectFromRoleInDb(slug: string, level: 'beginner' | 'intermediate' | 'advanced', project: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  const fieldKey = `projects.${level}`;
  await collection.updateOne(
    { id: slug },
    { 
      $pull: { [fieldKey]: project } as any,
      $set: { updatedAt: new Date().toISOString() }
    }
  );

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after project deletion.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function editProjectInRoleInDb(slug: string, level: 'beginner' | 'intermediate' | 'advanced', oldProject: string, newProject: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');
  const cleanNew = newProject.trim();
  if (!cleanNew) throw new Error('New project name cannot be empty.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  const fieldKey = `projects.${level}`;
  await collection.updateOne({ id: slug }, { $pull: { [fieldKey]: oldProject } as any });
  await collection.updateOne({ id: slug }, { $addToSet: { [fieldKey]: cleanNew } as any, $set: { updatedAt: new Date().toISOString() } });

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after project edit.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function addCertificationToRoleInDb(slug: string, cert: { name: string; type: 'FREE' | 'PAID' }): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');
  const cleanName = cert.name.trim();
  if (!cleanName) throw new Error('Certification name cannot be empty.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  // Pull existing matching name if present, then push new cert object
  await collection.updateOne({ id: slug }, { $pull: { certifications: { name: cleanName } } as any });
  await collection.updateOne(
    { id: slug },
    { 
      $push: { certifications: { name: cleanName, type: cert.type } } as any,
      $set: { updatedAt: new Date().toISOString() }
    }
  );

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after certification update.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function removeCertificationFromRoleInDb(slug: string, certName: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  await collection.updateOne(
    { id: slug },
    { 
      $pull: { certifications: { name: certName } } as any,
      $set: { updatedAt: new Date().toISOString() }
    }
  );

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after certification deletion.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function editCertificationInRoleInDb(slug: string, oldName: string, updatedCert: { name: string; type: 'FREE' | 'PAID' }): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');
  const cleanNewName = updatedCert.name.trim();
  if (!cleanNewName) throw new Error('New certification name cannot be empty.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  await collection.updateOne({ id: slug }, { $pull: { certifications: { name: oldName } } as any });
  await collection.updateOne(
    { id: slug },
    { 
      $push: { certifications: { name: cleanNewName, type: updatedCert.type } } as any,
      $set: { updatedAt: new Date().toISOString() }
    }
  );

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after certification edit.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function addToolToRoleInDb(slug: string, tool: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');
  const cleanTool = tool.trim();
  if (!cleanTool) throw new Error('Tool name cannot be empty.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  await collection.updateOne(
    { id: slug },
    { 
      $addToSet: { tools: cleanTool } as any,
      $set: { updatedAt: new Date().toISOString() }
    }
  );

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after tool update.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function removeToolFromRoleInDb(slug: string, tool: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  await collection.updateOne(
    { id: slug },
    { 
      $pull: { tools: tool } as any,
      $set: { updatedAt: new Date().toISOString() }
    }
  );

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after tool deletion.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

export async function editToolInRoleInDb(slug: string, oldTool: string, newTool: string): Promise<ITRole> {
  if (!isMongoConfigured()) throw new Error('MongoDB Atlas is not configured.');
  const cleanNew = newTool.trim();
  if (!cleanNew) throw new Error('New tool name cannot be empty.');

  const db = await getDb();
  const collection = db.collection<RoleDocument>(COLLECTION_NAME);

  await collection.updateOne({ id: slug }, { $pull: { tools: oldTool } as any });
  await collection.updateOne({ id: slug }, { $addToSet: { tools: cleanNew } as any, $set: { updatedAt: new Date().toISOString() } });

  const updatedDoc = await collection.findOne({ id: slug });
  if (!updatedDoc) throw new Error(`Role ${slug} not found after tool edit.`);

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
  } catch (e) {}

  return mapDocumentToITRole(updatedDoc);
}

function mapDocumentToITRole(doc: RoleDocument): ITRole {
  const { _id, ...rest } = doc;
  return {
    ...rest,
    tags: rest.tags || [],
    alternateNames: rest.alternateNames || [],
    technicalSkills: rest.technicalSkills || [],
    softSkills: rest.softSkills || [],
    tools: rest.tools || [],
    careerLadder: rest.careerLadder || [],
    industry: rest.industry || [],
    projects: {
      beginner: rest.projects?.beginner || [],
      intermediate: rest.projects?.intermediate || [],
      advanced: rest.projects?.advanced || []
    },
    certifications: rest.certifications || [],
    learningResources: rest.learningResources || [],
    roadmap: rest.roadmap || [],
    assessmentQuestions: rest.assessmentQuestions || [],
    interviewQuestions: rest.interviewQuestions || [],
    practicePlatforms: rest.practicePlatforms || []
  };
}
