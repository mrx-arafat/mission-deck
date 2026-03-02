import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';
import { triggerEvent, CHAT_CHANNEL } from '@/lib/pusher';

// PATCH - Update a task
export async function PATCH(
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

    // Get current task state for comparison
    const currentTask = await prisma.task.findUnique({ where: { id } });
    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build update data from only provided fields
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.assignee !== undefined) data.assignee = body.assignee || null;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.column !== undefined) data.column = body.column;
    if (body.tags !== undefined) data.tags = body.tags;

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    // --- Trigger Notifications ---
    const notifications: Array<{ type: string; title: string; message: string; agentId: string; taskId: string }> = [];

    // Task assigned to someone new
    if (body.assignee && body.assignee !== currentTask.assignee) {
      // Find agent by name
      const assignedAgent = await prisma.agent.findFirst({ where: { name: body.assignee } });
      if (assignedAgent && assignedAgent.id !== agent.id) {
        notifications.push({
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `${agent.name} assigned "${task.title}" to you`,
          agentId: assignedAgent.id,
          taskId: task.id,
        });
      }
    }

    // Task moved to "done"
    if (body.column === 'done' && currentTask.column !== 'done') {
      // Notify the assignee if it's not the current agent
      if (currentTask.assignee) {
        const assignedAgent = await prisma.agent.findFirst({ where: { name: currentTask.assignee } });
        if (assignedAgent && assignedAgent.id !== agent.id) {
          notifications.push({
            type: 'task_completed',
            title: 'Task Completed',
            message: `${agent.name} marked "${task.title}" as done`,
            agentId: assignedAgent.id,
            taskId: task.id,
          });
        }
      }
    }

    // Task moved to "review"
    if (body.column === 'review' && currentTask.column !== 'review') {
      // Notify all admins
      const admins = await prisma.agent.findMany({ where: { role: 'admin' } });
      for (const admin of admins) {
        if (admin.id !== agent.id) {
          notifications.push({
            type: 'task_updated',
            title: 'Task Ready for Review',
            message: `${agent.name} moved "${task.title}" to review`,
            agentId: admin.id,
            taskId: task.id,
          });
        }
      }
    }

    // Create notifications in DB and push via Pusher
    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
      for (const notif of notifications) {
        await triggerEvent(CHAT_CHANNEL, 'new-notification', {
          agentId: notif.agentId,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          taskId: notif.taskId,
        });
      }
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a task
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
