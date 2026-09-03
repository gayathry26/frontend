import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Supabase role storage is disabled. Role data is managed directly in MongoDB Atlas via /api/roles.' },
    { status: 410 }
  );
}
