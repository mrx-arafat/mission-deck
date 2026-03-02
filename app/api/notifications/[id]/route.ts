import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';

// PATCH - Mark notification as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const notification = await prisma.notification.updateMany({
      where: { id, agentId: agent.id },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
