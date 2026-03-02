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

    if (task.column === 'done') {
      return NextResponse.json({ error: 'Cannot claim completed task' }, { status: 400 });
    }

    if (task.claimedBy) {
      const claimer = await prisma.agent.findUnique({ where: { id: task.claimedBy } });
      return NextResponse.json(
        { error: `Task already claimed by ${claimer?.name || 'unknown'}` },
        { status: 409 }
      );
    }

    // Atomic update
    const updated = await prisma.task.update({
      where: { id },
      data: {
        claimedBy: agent.id,
        claimedAt: new Date(),
        assignee: agent.name,
        column: 'in-progress',
      },
    });

    // Notify all other agents
    const otherAgents = await prisma.agent.findMany({
      where: { id: { not: agent.id } },
    });

    const notifications = otherAgents.map(a => ({
      type: 'task_updated',
      title: 'Task Claimed',
      message: `${agent.name} claimed '${task.title}'`,
      agentId: a.id,
      taskId: task.id,
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
      for (const notif of notifications) {
        await triggerEvent(CHAT_CHANNEL, EVENTS.NEW_NOTIFICATION, {
          agentId: notif.agentId,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          taskId: notif.taskId,
        });
      }
    }

    await triggerEvent(CHAT_CHANNEL, EVENTS.TASK_CLAIMED, {
      taskId: id,
      agentId: agent.id,
      agentName: agent.name,
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error('Claim task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
