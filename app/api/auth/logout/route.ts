import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent, clearAuthCookie } from '@/lib/auth';
import { getPusherServer, CHAT_CHANNEL, EVENTS } from '@/lib/pusher';

export async function POST() {
  try {
    const agent = await getCurrentAgent();

    if (agent) {
      // Update status to offline
      await prisma.agent.update({
        where: { id: agent.id },
        data: { status: 'offline' },
      });

      // Notify other agents
      const pusher = getPusherServer();
      await pusher.trigger(CHAT_CHANNEL, EVENTS.AGENT_STATUS, {
        agentId: agent.id,
        username: agent.username,
        name: agent.name,
        status: 'offline',
      });
    }

    await clearAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
