import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const now = Date.now();

    // Get current claimant before unclaiming
    const task = await sql`SELECT claimed_by FROM tasks WHERE id = ${id}`;
    const claimedBy = task[0]?.claimed_by;

    // Unclaim the task
    await sql`
      UPDATE tasks SET
        claimed_by = NULL, claimed_at = NULL, assignee = NULL, locked_by = NULL, updated_at = ${now}
      WHERE id = ${id}
    `;

    // Free the agent
    if (claimedBy) {
      await sql`
        UPDATE agents SET current_task_id = NULL, status = 'online', last_active = ${now}
        WHERE id = ${claimedBy}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/tasks/[id]/unclaim error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
