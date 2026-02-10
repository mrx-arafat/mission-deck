import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';
import { triggerEvent, CHAT_CHANNEL, EVENTS } from '@/lib/pusher';

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
      await triggerEvent(CHAT_CHANNEL, EVENTS.AGENT_STATUS, {
        agentId: agent.id,
        username: agent.username,
        name: agent.name,
        status: 'offline',
      });
    }

    const response = NextResponse.json({ success: true });

    // Delete cookie directly on the response object
    response.cookies.set('mission-deck-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
