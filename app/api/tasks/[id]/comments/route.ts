import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';
import { triggerEvent, CHAT_CHANNEL } from '@/lib/pusher';

// GET - List comments for a task
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      include: {
        agent: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Fetch comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a comment to a task
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Verify task exists
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: body.content.trim(),
        taskId: id,
        agentId: agent.id,
      },
      include: {
        agent: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // Push real-time comment event
    await triggerEvent(CHAT_CHANNEL, 'new-comment', {
      taskId: id,
      comment,
    });

    // Notify the task assignee if it's not the commenter
    if (task.assignee) {
      const assignedAgent = await prisma.agent.findFirst({ where: { name: task.assignee } });
      if (assignedAgent && assignedAgent.id !== agent.id) {
        const notification = await prisma.notification.create({
          data: {
            type: 'mention',
            title: 'New Comment',
            message: `${agent.name} commented on "${task.title}"`,
            agentId: assignedAgent.id,
            taskId: task.id,
          },
        });
        await triggerEvent(CHAT_CHANNEL, 'new-notification', {
          agentId: assignedAgent.id,
          type: 'mention',
          title: notification.title,
          message: notification.message,
          taskId: task.id,
        });
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
