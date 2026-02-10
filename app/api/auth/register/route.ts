import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, getCurrentAgent } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password, name, role } = await req.json();

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if any agents exist (first registration is allowed without auth)
    const agentCount = await prisma.agent.count();

    if (agentCount > 0) {
      // Require admin auth for subsequent registrations
      const currentAgent = await getCurrentAgent();
      if (!currentAgent || currentAgent.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can register new agents' },
          { status: 403 }
        );
      }
    }

    // Check if username already exists
    const existing = await prisma.agent.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const agent = await prisma.agent.create({
      data: {
        username: username.toLowerCase(),
        password: hashedPassword,
        name,
        role: agentCount === 0 ? 'admin' : (role || 'agent'),
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
