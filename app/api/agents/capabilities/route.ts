import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAgent } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { capabilities } = await req.json();

    if (!Array.isArray(capabilities)) {
      return NextResponse.json({ error: 'capabilities must be an array of strings' }, { status: 400 });
    }

    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: { capabilities },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        capabilities: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ agent: updated });
  } catch (error) {
    console.error('Update capabilities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
