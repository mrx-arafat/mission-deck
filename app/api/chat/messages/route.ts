import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';
import { triggerEvent, CHAT_CHANNEL, EVENTS } from '@/lib/pusher';

// GET - Fetch chat messages (paginated)
export async function GET(req: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const after = searchParams.get('after'); // ISO timestamp for polling

    const whereClause = after
      ? { createdAt: { gt: new Date(after) } }
      : {};

    const messages = await prisma.message.findMany({
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: whereClause,
      orderBy: { createdAt: 'desc' },
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

    // Return in chronological order
    const sorted = messages.reverse();
    const nextCursor = messages.length === limit ? messages[0]?.id : null;

    return NextResponse.json({
      messages: sorted,
      nextCursor,
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(req: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        type: 'message',
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

    // Broadcast via Pusher (no-op if not configured)
    await triggerEvent(CHAT_CHANNEL, EVENTS.NEW_MESSAGE, message);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Clear all messages (admin only)
export async function DELETE() {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (agent.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can clear chat' },
        { status: 403 }
      );
    }

    await prisma.message.deleteMany({});

    // Broadcast chat cleared event (no-op if not configured)
    await triggerEvent(CHAT_CHANNEL, EVENTS.CHAT_CLEARED, {
      clearedBy: agent.name,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
