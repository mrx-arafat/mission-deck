import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';
import { getPusherServer, CHAT_CHANNEL, EVENTS } from '@/lib/pusher';

// POST - Admin sends instruction to all agents
export async function POST(req: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (agent.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can send instructions' },
        { status: 403 }
      );
    }

    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Instruction content is required' },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        type: 'instruction',
        agentId: agent.id,
      },
      include: {
        agent: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Broadcast instruction via Pusher
    const pusher = getPusherServer();
    await pusher.trigger(CHAT_CHANNEL, EVENTS.NEW_MESSAGE, message);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Instruct error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
