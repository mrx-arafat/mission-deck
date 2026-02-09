import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema, seedIfEmpty, resetSchema } from '@/app/lib/db-schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get('reset') === 'true';

    if (reset) {
      await resetSchema();
    }

    await ensureSchema();
    const seeded = await seedIfEmpty();
    return NextResponse.json({ ok: true, seeded, reset });
  } catch (error) {
    console.error('Setup failed:', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET(new Request('http://localhost/api/setup') as unknown as NextRequest);
}
