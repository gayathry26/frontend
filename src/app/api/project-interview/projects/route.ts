import { NextResponse } from 'next/server';
import { getUserProjects, addUserProject } from '@/backend/services/projectInterviewService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await getUserProjects('default_student');
    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newProject = await addUserProject(body, 'default_student');
    return NextResponse.json({ success: true, project: newProject });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
