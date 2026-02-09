import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { agentId } = await request.json();
    const now = Date.now();

    // Atomic claim: only succeeds if nobody else claimed it
    const result = await sql`
      UPDATE tasks SET
        claimed_by = ${agentId},
        claimed_at = ${now},
        assignee = ${agentId},
        locked_by = ${agentId},
        "column" = CASE WHEN "column" IN ('backlog', 'todo') THEN 'in-progress' ELSE "column" END,
        updated_at = ${now}
      WHERE id = ${id} AND claimed_by IS NULL
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Task already claimed' },
        { status: 409 }
      );
    }

    // Update agent
    await sql`
      UPDATE agents SET current_task_id = ${id}, status = 'busy', last_active = ${now}
      WHERE id = ${agentId}
    `;

    // Insert worklog
    await sql`
      INSERT INTO worklog (task_id, agent_id, action, created_at)
      VALUES (${id}, ${agentId}, 'claimed', ${now})
    `;

    return NextResponse.json({ ok: true, claimedAt: now });
  } catch (error) {
    console.error('POST /api/tasks/[id]/claim error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
