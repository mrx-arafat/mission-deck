import { NextResponse } from 'next/server';
import { getCurrentAgent } from '@/lib/auth';

export async function GET() {
  try {
    const agent = await getCurrentAgent();

    if (!agent) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
