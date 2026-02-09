import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET() {
  try {
    // Fetch all tasks
    const taskRows = await sql`
      SELECT id, title, description, assignee, priority, "column", tags,
             created_at, updated_at, claimed_by, claimed_at, locked_by,
             handoff_from, handoff_to, handoff_note, is_handoff
      FROM tasks ORDER BY updated_at DESC
    `;

    // Fetch all worklog entries
    const worklogRows = await sql`
      SELECT task_id, agent_id, action, detail, created_at
      FROM worklog ORDER BY created_at ASC
    `;

    // Group worklog by task_id
    const worklogMap = new Map<string, Array<{ agentId: string; action: string; timestamp: number; detail?: string }>>();
    for (const w of worklogRows) {
      const arr = worklogMap.get(w.task_id) || [];
      arr.push({
        agentId: w.agent_id,
        action: w.action,
        timestamp: Number(w.created_at),
        detail: w.detail || undefined,
      });
      worklogMap.set(w.task_id, arr);
    }

    const tasks = taskRows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description || undefined,
      assignee: r.assignee || undefined,
      priority: r.priority,
      column: r.column,
      tags: r.tags || [],
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      claimedBy: r.claimed_by || undefined,
      claimedAt: r.claimed_at ? Number(r.claimed_at) : undefined,
      lockedBy: r.locked_by || undefined,
      handoffFrom: r.handoff_from || undefined,
      handoffTo: r.handoff_to || undefined,
      handoffNote: r.handoff_note || undefined,
      isHandoff: r.is_handoff || false,
      worklog: worklogMap.get(r.id) || [],
    }));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = Date.now();
    const id = `t${now}-${Math.random().toString(36).slice(2, 6)}`;

    await sql`
      INSERT INTO tasks (id, title, description, assignee, priority, "column", tags, created_at, updated_at)
      VALUES (${id}, ${body.title}, ${body.description || null}, ${body.assignee || null},
              ${body.priority || 'medium'}, ${body.column || 'backlog'}, ${body.tags || []},
              ${now}, ${now})
    `;

    return NextResponse.json({
      id,
      title: body.title,
      description: body.description || undefined,
      assignee: body.assignee || undefined,
      priority: body.priority || 'medium',
      column: body.column || 'backlog',
      tags: body.tags || [],
      createdAt: now,
      updatedAt: now,
      worklog: [],
    });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
