import { NextRequest, NextResponse } from 'next/server';
import { addCertificationToRoleInDb, removeCertificationFromRoleInDb, editCertificationInRoleInDb, getRoleBySlugFromDb } from '@/backend/services/roleService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/admin/roles/[slug]/certifications
 * Atomic certification management endpoint:
 *  - action: "ADD_CERTIFICATION" | "REMOVE_CERTIFICATION" | "EDIT_CERTIFICATION"
 *  - certName: string
 *  - certType: "FREE" | "PAID"
 *  - oldName: string (for edit)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const existing = await getRoleBySlugFromDb(slug);

    if (!existing) {
      return NextResponse.json({ success: false, error: `Role '${slug}' not found in MongoDB Atlas.` }, { status: 404 });
    }

    const body = await req.json();
    const { action, certName, certType, oldName } = body;

    let updatedRole;

    switch (action) {
      case 'ADD_CERTIFICATION': {
        if (!certName || !String(certName).trim()) {
          return NextResponse.json({ success: false, error: 'Certification name cannot be empty.' }, { status: 400 });
        }
        if (!certType || !['FREE', 'PAID'].includes(certType)) {
          return NextResponse.json({ success: false, error: "Certification type must be 'FREE' or 'PAID'." }, { status: 400 });
        }
        updatedRole = await addCertificationToRoleInDb(slug, { name: String(certName).trim(), type: certType });
        break;
      }
      case 'REMOVE_CERTIFICATION': {
        if (!certName || !String(certName).trim()) {
          return NextResponse.json({ success: false, error: 'Certification name cannot be empty.' }, { status: 400 });
        }
        updatedRole = await removeCertificationFromRoleInDb(slug, String(certName).trim());
        break;
      }
      case 'EDIT_CERTIFICATION': {
        if (!oldName || !certName || !String(certName).trim()) {
          return NextResponse.json({ success: false, error: 'Old and new certification names are required.' }, { status: 400 });
        }
        if (!certType || !['FREE', 'PAID'].includes(certType)) {
          return NextResponse.json({ success: false, error: "Certification type must be 'FREE' or 'PAID'." }, { status: 400 });
        }
        updatedRole = await editCertificationInRoleInDb(slug, String(oldName).trim(), { name: String(certName).trim(), type: certType });
        break;
      }
      default:
        return NextResponse.json({ success: false, error: `Unsupported action: '${action}'.` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Certification operation '${action}' completed successfully in MongoDB Atlas.`,
      role: updatedRole
    });
  } catch (error: any) {
    console.error('API Error managing certifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to perform certification operation in MongoDB Atlas' },
      { status: 500 }
    );
  }
}
