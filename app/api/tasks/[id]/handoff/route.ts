import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { fromId, toId, note } = await request.json();
    const now = Date.now();

    // Update task with handoff info
    await sql`
      UPDATE tasks SET
        handoff_from = ${fromId},
        handoff_to = ${toId},
        handoff_note = ${note || null},
        is_handoff = TRUE,
        assignee = ${toId},
        claimed_by = ${toId},
        locked_by = ${toId},
        updated_at = ${now}
      WHERE id = ${id}
    `;

    // Free the original agent
    if (fromId && fromId !== 'human') {
      await sql`
        UPDATE agents SET current_task_id = NULL, status = 'online', last_active = ${now}
        WHERE id = ${fromId}
      `;
    }

    // Assign to new agent
    if (toId && toId !== 'human') {
      await sql`
        UPDATE agents SET current_task_id = ${id}, status = 'busy', last_active = ${now}
        WHERE id = ${toId}
      `;
    }

    // Insert worklog entry
    await sql`
      INSERT INTO worklog (task_id, agent_id, action, detail, created_at)
      VALUES (${id}, ${fromId || 'system'}, ${`handoff to ${toId}`}, ${note || null}, ${now})
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/tasks/[id]/handoff error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
