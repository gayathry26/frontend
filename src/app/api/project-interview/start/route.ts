import { NextResponse } from 'next/server';
import { createInterviewSession } from '@/backend/interview/adaptiveInterviewEngine';
import { loadSampleRepository } from '@/backend/github/repositoryFetcher';
import { buildProjectKnowledge } from '@/backend/analysis/projectKnowledgeBuilder';
import { chunkSourceFiles } from '@/backend/rag/chunker';
import { query, isPostgresConfigured } from '@/backend/config/postgres';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, mode } = body;

    const globalProjects = (global as any)._githubProjectsMap || new Map();
    let project = globalProjects.get(projectId);

    if (!project && isPostgresConfigured()) {
      try {
        const res = await query(`SELECT * FROM analyzed_github_repositories WHERE project_id = $1 LIMIT 1;`, [projectId]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          project = {
            projectId: row.project_id,
            name: row.name,
            url: row.url,
            projectKnowledge: typeof row.project_knowledge === 'string' ? JSON.parse(row.project_knowledge) : row.project_knowledge,
            summary: row.summary,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
          };
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
