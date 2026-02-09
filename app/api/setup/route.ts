import { NextResponse } from 'next/server';
import { ensureSchema, seedIfEmpty } from '@/app/lib/db-schema';

export async function GET() {
  try {
    await ensureSchema();
    const seeded = await seedIfEmpty();
    return NextResponse.json({ ok: true, seeded });
  } catch (error) {
    console.error('Setup failed:', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
