import { NextResponse } from 'next/server';
import { loadDefaultReadme } from '@/backend/services/readmeService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = loadDefaultReadme();
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Default README not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, content: result.content, filepath: result.filepath });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
