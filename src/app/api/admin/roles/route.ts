import { NextRequest, NextResponse } from 'next/server';
import { getAllRolesFromDb, searchRolesFromDb, upsertRoleInDb, getUniqueCategoriesFromDb } from '../../../../../backend/services/roleService';
import { ITRole } from '../../../../../backend/types/role';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/roles
 * Returns all roles from MongoDB Atlas with optional search, category filter, and categories list.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('search') || '';
    const category = searchParams.get('category') || null;

    const filteredCategory = category && category !== 'All' ? category : null;
    const roles = await searchRolesFromDb(query, [], filteredCategory);
    const categories = await getUniqueCategoriesFromDb();

    return NextResponse.json({
      success: true,
      count: roles.length,
      categories,
      roles
    });
  } catch (error: any) {
    console.error('API Error fetching admin roles:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch roles from MongoDB Atlas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/roles
 * Creates a new role in MongoDB Atlas.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      title, category, shortDescription, scope, jobMarketProjection, 
      technicalSkills, softSkills, tools, industry, projects, certifications, 
      roadmap, stats, alternateNames 
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Role title is required.' }, { status: 400 });
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return NextResponse.json({ success: false, error: 'Category is required.' }, { status: 400 });
    }

    const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingRoles = await getAllRolesFromDb();
    if (existingRoles.some(r => r.id === slug || r.title.toLowerCase() === title.trim().toLowerCase())) {
      return NextResponse.json({ success: false, error: `A role with title '${title.trim()}' already exists in MongoDB Atlas.` }, { status: 409 });
    }

    const newRoleData: ITRole = {
      id: slug,
      title: title.trim(),
      category: category.trim(),
      tags: [category.trim() as any],
      shortDescription: (shortDescription || `${title.trim()} role in ${category.trim()}`).trim(),
      technicalSkills: Array.isArray(technicalSkills) ? technicalSkills.map(s => String(s).trim()).filter(Boolean) : [],
      softSkills: Array.isArray(softSkills) ? softSkills.map(s => String(s).trim()).filter(Boolean) : [],
      tools: Array.isArray(tools) ? tools.map(t => String(t).trim()).filter(Boolean) : [],
      industry: Array.isArray(industry) ? industry.map(i => String(i).trim()).filter(Boolean) : [category.trim()],
      careerLadder: [],
      alternateNames: Array.isArray(alternateNames) ? alternateNames : [title.trim().toLowerCase()],
      scope: scope?.trim() || `${title.trim()} Scope`,
      jobMarketProjection: jobMarketProjection?.trim() || 'High Demand',
      projects: projects || { beginner: [], intermediate: [], advanced: [] },
      certifications: Array.isArray(certifications) ? certifications : [],
      roadmap: Array.isArray(roadmap) ? roadmap : [],
      stats: stats || { averageSalary: '', jobOpenings: '', growthRate: '' }
    };

    const createdRole = await upsertRoleInDb(newRoleData, 'admin');

    return NextResponse.json({
      success: true,
      message: `Created new role '${createdRole.title}' successfully in MongoDB Atlas.`,
      role: createdRole
    }, { status: 201 });
  } catch (error: any) {
    console.error('API Error creating new role:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create role in MongoDB Atlas' },
      { status: 500 }
    );
  }
}
