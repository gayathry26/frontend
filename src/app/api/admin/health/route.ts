import { NextResponse } from 'next/server';
import { checkMongoHealth } from '@/backend/config/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await checkMongoHealth();

    if (!health.connected) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          dbName: health.dbName,
          error: health.error || 'MongoDB Atlas ping failed'
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      dbName: health.dbName,
      host: health.host,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: err.message || 'Health check error'
      },
      { status: 500 }
    );
  }
}
