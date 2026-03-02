import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';
import { triggerEvent, CHAT_CHANNEL, EVENTS } from '@/lib/pusher';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only the claimer or admin can unclaim
    if (task.claimedBy !== agent.id && agent.role !== 'admin') {
      return NextResponse.json({ error: 'Only the claimer or admin can release this task' }, { status: 403 });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        claimedBy: null,
        claimedAt: null,
        column: 'todo',
        assignee: null,
      },
    });

    await triggerEvent(CHAT_CHANNEL, EVENTS.TASK_UNCLAIMED, {
      taskId: id,
      agentId: agent.id,
      agentName: agent.name,
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error('Unclaim task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
