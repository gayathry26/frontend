import { NextResponse } from 'next/server';
import { fetchAndProcessRepository, loadSampleRepository, SAMPLE_REPOSITORIES } from '@/backend/github/repositoryFetcher';
import { buildProjectKnowledge } from '@/backend/analysis/projectKnowledgeBuilder';
import { chunkSourceFiles } from '@/backend/rag/chunker';
import { query, isPostgresConfigured } from '@/backend/config/postgres';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { repoUrl, sampleId, readmeContent } = body;

    let repoData;

    if (sampleId) {
      repoData = loadSampleRepository(sampleId);
    } else if (repoUrl && typeof repoUrl === 'string' && repoUrl.trim()) {
      repoData = await fetchAndProcessRepository(repoUrl.trim());
    } else if (readmeContent && typeof readmeContent === 'string') {
      // Fallback for raw text upload
      repoData = {
        id: `custom_repo_${Date.now()}`,
        name: 'Uploaded Project Documentation',
        owner: 'user',
        url: 'custom://upload',
        metadata: {
          name: 'Custom Project',
          fullName: 'user/custom-project',
          owner: 'user',
          description: 'Uploaded repository code & documentation',
          stars: 1,
          forks: 0,
          openIssues: 0,
          defaultBranch: 'main',
          primaryLanguage: 'TypeScript',
          topics: ['project-defense'],
          updatedAt: new Date().toISOString(),
          sizeKb: Math.round(readmeContent.length / 1024),
        },
        commits: [],
        allFilePaths: ['README.md', 'package.json'],
        analyzedFiles: [
          {
            path: 'README.md',
            category: 'DOCS',
            content: readmeContent,
            sizeBytes: readmeContent.length,
          }
        ],
        summary: {
          totalFiles: 2,
          analyzedCount: 1,
          categories: { DOCS: 1 },
        },
        fetchedAt: new Date().toISOString(),
      };
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide a valid GitHub repository URL or select a sample repository.',
        },
        { status: 400 }
      );
    }

    // Build rich project knowledge
    const projectKnowledge = buildProjectKnowledge(repoData);

    // Chunk code files
    const chunks = chunkSourceFiles(repoData.id, repoData.analyzedFiles);

    // Save project in memory map and MongoDB
    const projectRecord = {
      projectId: repoData.id,
      name: projectKnowledge.project,
      url: projectKnowledge.url,
      projectKnowledge,
      chunks,
      updatedAt: new Date().toISOString(),
    };

    const globalProjects = (global as any)._githubProjectsMap || new Map();
    globalProjects.set(repoData.id, projectRecord);
    (global as any)._githubProjectsMap = globalProjects;

    if (isPostgresConfigured()) {
      try {
        await query(`
          INSERT INTO analyzed_github_repositories (project_id, name, url, project_knowledge, summary, metadata, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (project_id) DO UPDATE SET
            name = EXCLUDED.name,
            url = EXCLUDED.url,
            project_knowledge = EXCLUDED.project_knowledge,
            summary = EXCLUDED.summary,
            metadata = EXCLUDED.metadata,
            updated_at = NOW();
        `, [
          repoData.id,
          projectKnowledge.project,
          projectKnowledge.url,
          JSON.stringify(projectKnowledge),
          repoData.summary || null,
          JSON.stringify(repoData.metadata || {})
        ]);
      } catch (e) {
        console.warn('PostgreSQL save error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      projectId: repoData.id,
      projectKnowledge,
      summary: repoData.summary,
      metadata: repoData.metadata,
      chunksCount: chunks.length,
      sampleRepositories: SAMPLE_REPOSITORIES.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        primaryLanguage: s.primaryLanguage,
        stars: s.stars,
      })),
    });
  } catch (err: any) {
    console.error('Error in /api/project-interview/analyze:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to analyze GitHub repository.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return sample repositories for quick-load cards
  return NextResponse.json({
    success: true,
    samples: SAMPLE_REPOSITORIES.map((s) => ({
      id: s.id,
      name: s.name,
      owner: s.owner,
      url: s.url,
      description: s.description,
      primaryLanguage: s.primaryLanguage,
      stars: s.stars,
    })),
  });
}
