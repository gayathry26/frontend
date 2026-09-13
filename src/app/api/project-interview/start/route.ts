import { NextResponse } from 'next/server';
import { createInterviewSession } from '@/backend/interview/adaptiveInterviewEngine';
import { loadSampleRepository } from '@/backend/github/repositoryFetcher';
import { buildProjectKnowledge } from '@/backend/analysis/projectKnowledgeBuilder';
import { chunkSourceFiles } from '@/backend/rag/chunker';
import { getDb, isMongoConfigured } from '@/backend/config/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, mode } = body;

    const globalProjects = (global as any)._githubProjectsMap || new Map();
    let project = globalProjects.get(projectId);

    if (!project && isMongoConfigured()) {
      try {
        const db = await getDb();
        const doc = await db.collection('analyzed_github_repositories').findOne({ projectId });
        if (doc) {
          project = doc;
        }
      } catch {}
    }

    // If still not found, fallback to sample repository
    if (!project) {
      const sample = loadSampleRepository('sample_ecommerce_next_mongo');
      const projectKnowledge = buildProjectKnowledge(sample);
      const chunks = chunkSourceFiles(sample.id, sample.analyzedFiles);
      project = {
        projectId: sample.id,
        name: sample.name,
        projectKnowledge,
        chunks,
      };
      globalProjects.set(sample.id, project);
      (global as any)._githubProjectsMap = globalProjects;
    }

    const session = await createInterviewSession({
      projectId: project.projectId,
      projectKnowledge: project.projectKnowledge,
      chunks: project.chunks || [],
      mode: mode || 'QUICK',
    });

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (err: any) {
    console.error('Error in /api/project-interview/start:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to start interview session' },
      { status: 500 }
    );
  }
}
