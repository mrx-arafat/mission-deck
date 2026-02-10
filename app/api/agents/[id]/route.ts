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

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.status !== undefined) {
      updates.push('status');
      values.push(body.status);
    }
    if (body.currentTaskId !== undefined) {
      updates.push('current_task_id');
      values.push(body.currentTaskId);
    }
    if (body.completedTasks !== undefined) {
      updates.push('completed_tasks');
      values.push(body.completedTasks);
    }

    // Build dynamic update using parameterized query
    await sql`
      UPDATE agents SET
        status = COALESCE(${body.status ?? null}, status),
        current_task_id = ${body.currentTaskId !== undefined ? body.currentTaskId : null},
        completed_tasks = COALESCE(${body.completedTasks ?? null}, completed_tasks),
        last_active = ${now}
      WHERE id = ${id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/agents/[id] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
