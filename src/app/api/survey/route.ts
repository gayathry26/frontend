import { NextRequest, NextResponse } from 'next/server';
import { getDb, isMongoConfigured } from '@/backend/config/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/survey
 * Collects working IT professional experience survey submissions into MongoDB collection `professional_submissions`.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isMongoConfigured()) {
      return NextResponse.json({ success: false, error: 'MongoDB Atlas is not configured.' }, { status: 500 });
    }

    const body = await req.json();
    const { roleId, roleTitle, yearsOfExperience, industry, technicalSkills, softSkills, tools, recommendedSkills, adminNotes } = body;

    if (!roleTitle || !String(roleTitle).trim()) {
      return NextResponse.json({ success: false, error: 'Role title is required.' }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection('professional_submissions');

    const submissionDoc = {
      roleId: roleId || String(roleTitle).toLowerCase().replace(/\s+/g, '-'),
      roleTitle: String(roleTitle).trim(),
      yearsOfExperience: yearsOfExperience || '1-3 years',
      industry: industry || 'Technology',
      technicalSkills: Array.isArray(technicalSkills) ? technicalSkills : [],
      softSkills: Array.isArray(softSkills) ? softSkills : [],
      tools: Array.isArray(tools) ? tools : [],
      recommendedSkills: Array.isArray(recommendedSkills) ? recommendedSkills : [],
      status: 'approved',
      createdAt: new Date().toISOString()
    };

    await collection.insertOne(submissionDoc);

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your IT professional experience has been recorded in MongoDB Atlas.',
      submission: submissionDoc
    });
  } catch (error: any) {
    console.error('API Error submitting survey:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit professional survey' },
      { status: 500 }
    );
  }
}
