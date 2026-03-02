import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// GET - List all agents (auto-mark stale agents as offline)
export async function GET() {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

    // Mark agents with stale updatedAt as offline
    await prisma.agent.updateMany({
      where: {
        status: 'online',
        updatedAt: { lt: cutoff },
      },
      data: { status: 'offline' },
    });

    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        capabilities: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Fetch agents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
