import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';
import { triggerEvent, CHAT_CHANNEL, EVENTS } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, agent.password);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update agent status to online
    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'online' },
    });

    // Notify other agents (no-op if Pusher not configured)
    await triggerEvent(CHAT_CHANNEL, EVENTS.AGENT_STATUS, {
      agentId: agent.id,
      username: agent.username,
      name: agent.name,
      status: 'online',
    });

    const token = signToken({
      agentId: agent.id,
      username: agent.username,
      role: agent.role,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      token, // For bot/API clients using Authorization: Bearer
      agent: {
        id: agent.id,
        username: agent.username,
        name: agent.name,
        role: agent.role,
        status: 'online',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
