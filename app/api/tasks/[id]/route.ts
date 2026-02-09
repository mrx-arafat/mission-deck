import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const now = Date.now();

    await sql`
      UPDATE tasks SET
        title = COALESCE(${body.title ?? null}, title),
        description = COALESCE(${body.description ?? null}, description),
        assignee = ${body.assignee !== undefined ? (body.assignee || null) : null},
        priority = COALESCE(${body.priority ?? null}, priority),
        "column" = COALESCE(${body.column ?? null}, "column"),
        tags = COALESCE(${body.tags ?? null}, tags),
        claimed_by = ${body.claimedBy !== undefined ? (body.claimedBy || null) : null},
        claimed_at = ${body.claimedAt ?? null},
        locked_by = ${body.lockedBy !== undefined ? (body.lockedBy || null) : null},
        handoff_from = ${body.handoffFrom !== undefined ? (body.handoffFrom || null) : null},
        handoff_to = ${body.handoffTo !== undefined ? (body.handoffTo || null) : null},
        handoff_note = ${body.handoffNote !== undefined ? (body.handoffNote || null) : null},
        is_handoff = COALESCE(${body.isHandoff ?? null}, is_handoff),
        updated_at = ${now}
      WHERE id = ${id}
    `;

    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await sql`DELETE FROM worklog WHERE task_id = ${id}`;
    await sql`DELETE FROM tasks WHERE id = ${id}`;
    // Also free any agent that had this task
    await sql`UPDATE agents SET current_task_id = NULL, status = 'online' WHERE current_task_id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
