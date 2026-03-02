import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';

// POST - Mark all notifications as read for current agent
export async function POST() {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { agentId: agent.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
