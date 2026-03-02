import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';

// POST - Agent heartbeat: update status to online and refresh updatedAt
export async function POST() {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'online' },
    });

    return NextResponse.json({ success: true, status: 'online' });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
