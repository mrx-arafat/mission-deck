import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';

// GET - List notifications for current agent
export async function GET() {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { agentId: agent.id, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
