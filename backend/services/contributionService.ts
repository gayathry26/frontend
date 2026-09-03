import { ObjectId, type Filter } from 'mongodb';
import { getDb, isMongoConfigured } from '../config/mongodb';
import { ContributionDocument, ContributorInfo, ITRole, RoleVersionDocument } from '../types/role';
import { getRoleBySlugFromDb, upsertRoleInDb } from './roleService';

const COLLECTION_NAME = 'contributions';

export async function submitContribution(
  roleId: string,
  contributor: ContributorInfo,
  submittedData: Partial<ITRole>,
  source: string = 'IT Professional Submission'
): Promise<ContributionDocument> {
  const now = new Date().toISOString();
  const doc: ContributionDocument = {
    roleId,
    contributor,
    submittedData,
    source,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };

  if (!isMongoConfigured()) {
    return { ...doc, _id: 'temp-id-' + Date.now() };
  }

  const db = await getDb();
  const res = await db.collection<ContributionDocument>(COLLECTION_NAME).insertOne(doc);
  return { ...doc, _id: res.insertedId.toString() };
}

export async function getContributions(status?: 'pending' | 'approved' | 'rejected'): Promise<ContributionDocument[]> {
  if (!isMongoConfigured()) {
    return [];
  }

  const db = await getDb();
  const query = status ? { status } : {};
  const docs = await db.collection<ContributionDocument>(COLLECTION_NAME)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(doc => ({
    ...doc,
    _id: doc._id?.toString()
  }));
}

export async function approveContribution(
  contributionId: string,
  reviewerName: string = 'Admin',
  adminNotes?: string
): Promise<{ success: boolean; updatedRole?: ITRole; error?: string }> {
  if (!isMongoConfigured()) {
    return { success: false, error: 'MongoDB connection not configured.' };
  }

  const db = await getDb();
  const collection = db.collection<ContributionDocument>(COLLECTION_NAME);

  let objId: ObjectId;
  try {
    objId = new ObjectId(contributionId);
  } catch (e) {
    return { success: false, error: 'Invalid contribution ID' };
  }

  const contribution = await collection.findOne({ _id: objId } as unknown as Filter<ContributionDocument>);
  if (!contribution) {
    return { success: false, error: 'Contribution not found' };
  }

  if (contribution.status === 'approved') {
    return { success: false, error: 'Contribution has already been approved' };
  }

  const existingRole = await getRoleBySlugFromDb(contribution.roleId);

  const baseRole: ITRole = existingRole || {
    id: contribution.roleId,
    title: contribution.submittedData.title || contribution.roleId,
    category: contribution.submittedData.category || 'General IT',
    tags: contribution.submittedData.tags || ['Hybrid'],
    shortDescription: contribution.submittedData.shortDescription || '',
    alternateNames: contribution.submittedData.alternateNames || [],
    technicalSkills: contribution.submittedData.technicalSkills || [],
    softSkills: contribution.submittedData.softSkills || [],
    careerLadder: contribution.submittedData.careerLadder || [],
    scope: contribution.submittedData.scope || '',
    jobMarketProjection: contribution.submittedData.jobMarketProjection || '',
    industry: contribution.submittedData.industry || []
  };

  const mergedRole: ITRole = {
    ...baseRole,
    ...contribution.submittedData,
    id: baseRole.id
  };

  const updatedRole = await upsertRoleInDb(mergedRole, reviewerName);

  const now = new Date().toISOString();
  await collection.updateOne(
    { _id: objId } as unknown as Filter<ContributionDocument>,
    {
      $set: {
        status: 'approved',
        adminNotes: adminNotes || contribution.adminNotes,
        reviewedAt: now,
        reviewedBy: reviewerName,
        updatedAt: now
      }
    }
  );

  return { success: true, updatedRole };
}

export async function rejectContribution(
  contributionId: string,
  reviewerName: string = 'Admin',
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isMongoConfigured()) {
    return { success: false, error: 'MongoDB connection not configured.' };
  }

  const db = await getDb();
  let objId: ObjectId;
  try {
    objId = new ObjectId(contributionId);
  } catch (e) {
    return { success: false, error: 'Invalid contribution ID' };
  }

  const now = new Date().toISOString();
  const res = await db.collection<ContributionDocument>(COLLECTION_NAME).updateOne(
    { _id: objId } as unknown as Filter<ContributionDocument>,
    {
      $set: {
        status: 'rejected',
        adminNotes: adminNotes || 'Rejected during review',
        reviewedAt: now,
        reviewedBy: reviewerName,
        updatedAt: now
      }
    }
  );

  if (res.matchedCount === 0) {
    return { success: false, error: 'Contribution not found' };
  }

  return { success: true };
}

export async function getRoleVersionHistory(roleId: string): Promise<RoleVersionDocument[]> {
  if (!isMongoConfigured()) return [];

  const db = await getDb();
  const docs = await db.collection<RoleVersionDocument>('role_versions')
    .find({ roleId })
    .sort({ version: -1 })
    .toArray();

  return docs.map(doc => ({
    ...doc,
    _id: doc._id?.toString()
  }));
}
