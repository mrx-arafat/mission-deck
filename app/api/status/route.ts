import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    let rows;
    if (since) {
      rows = await sql`
        SELECT id, agent_id, agent_name, type, message, created_at, task_id, task_title
        FROM status_updates
        WHERE created_at > ${Number(since)}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT id, agent_id, agent_name, type, message, created_at, task_id, task_title
        FROM status_updates
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    const updates = rows.map(r => ({
      id: r.id,
      agentId: r.agent_id,
      agentName: r.agent_name,
      type: r.type,
      message: r.message,
      timestamp: Number(r.created_at),
      taskId: r.task_id || undefined,
      taskTitle: r.task_title || undefined,
    }));

    return NextResponse.json(updates);
  } catch (error) {
    console.error('GET /api/status error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = Date.now();
    const id = `u-${now}-${Math.random().toString(36).slice(2, 6)}`;

    await sql`
      INSERT INTO status_updates (id, agent_id, agent_name, type, message, created_at, task_id, task_title)
      VALUES (${id}, ${body.agentId}, ${body.agentName}, ${body.type}, ${body.message},
              ${now}, ${body.taskId || null}, ${body.taskTitle || null})
    `;

    return NextResponse.json({
      id,
      agentId: body.agentId,
      agentName: body.agentName,
      type: body.type,
      message: body.message,
      timestamp: now,
      taskId: body.taskId || undefined,
      taskTitle: body.taskTitle || undefined,
    });
  } catch (error) {
    console.error('POST /api/status error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
