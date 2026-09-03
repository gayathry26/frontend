import { NextRequest, NextResponse } from 'next/server';
import { getRoleBySlugFromDb, upsertRoleInDb, deleteRoleInDb } from '@/backend/services/roleService';
import { ITRole } from '@/backend/types/role';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/admin/roles/[slug]
 * Fetches a single role document by slug/id from MongoDB Atlas.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const role = await getRoleBySlugFromDb(slug);

    if (!role) {
      return NextResponse.json({ success: false, error: `Role '${slug}' not found in MongoDB Atlas.` }, { status: 404 });
    }

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    console.error(`API Error fetching role:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch role from MongoDB Atlas' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/roles/[slug]
 * Updates role document fields in MongoDB Atlas with validation.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const existing = await getRoleBySlugFromDb(slug);

    if (!existing) {
      return NextResponse.json({ success: false, error: `Role '${slug}' not found in MongoDB Atlas.` }, { status: 404 });
    }

    const body = await req.json();
    const { 
      title, category, shortDescription, scope, jobMarketProjection, 
      technicalSkills, softSkills, tools, industry, projects, certifications, 
      roadmap, stats, alternateNames 
    } = body;

    const updatedRoleData: ITRole = {
      ...existing,
      id: slug,
      title: title?.trim() || existing.title,
      category: category?.trim() || existing.category,
      shortDescription: shortDescription !== undefined ? String(shortDescription).trim() : existing.shortDescription,
      scope: scope !== undefined ? String(scope).trim() : existing.scope,
      jobMarketProjection: jobMarketProjection !== undefined ? String(jobMarketProjection).trim() : existing.jobMarketProjection,
      technicalSkills: Array.isArray(technicalSkills) ? technicalSkills.map(s => String(s).trim()).filter(Boolean) : existing.technicalSkills,
      softSkills: Array.isArray(softSkills) ? softSkills.map(s => String(s).trim()).filter(Boolean) : existing.softSkills,
      tools: Array.isArray(tools) ? tools.map(t => String(t).trim()).filter(Boolean) : (existing.tools || []),
      industry: Array.isArray(industry) ? industry.map(i => String(i).trim()).filter(Boolean) : (existing.industry || []),
      projects: projects || existing.projects || { beginner: [], intermediate: [], advanced: [] },
      certifications: Array.isArray(certifications) ? certifications : (existing.certifications || []),
      roadmap: Array.isArray(roadmap) ? roadmap : (existing.roadmap || []),
      stats: stats !== undefined ? stats : existing.stats,
      alternateNames: Array.isArray(alternateNames) ? alternateNames : (existing.alternateNames || [])
    };

    const savedRole = await upsertRoleInDb(updatedRoleData, 'admin');

    return NextResponse.json({
      success: true,
      message: `Updated '${savedRole.title}' successfully in MongoDB Atlas.`,
      role: savedRole
    });
  } catch (error: any) {
    console.error(`API Error updating role:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update role in MongoDB Atlas' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/roles/[slug]
 * Deletes role permanently from MongoDB Atlas.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const existing = await getRoleBySlugFromDb(slug);

    if (!existing) {
      return NextResponse.json({ success: false, error: `Role '${slug}' not found in MongoDB Atlas.` }, { status: 404 });
    }

    const isDeleted = await deleteRoleInDb(slug);

    return NextResponse.json({
      success: true,
      message: `Permanently deleted '${existing.title}' from MongoDB Atlas.`,
      deletedSlug: slug
    });
  } catch (error: any) {
    console.error(`API Error deleting role:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete role from MongoDB Atlas' },
      { status: 500 }
    );
  }
}
