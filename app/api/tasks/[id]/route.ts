import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/app/lib/db';

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const sql = getDb();
    const { id } = await params;
    const body = await request.json();
    const now = Date.now();

    // Check task exists first
    const existing = await sql`SELECT id FROM kanban_tasks WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update only provided fields individually
    if (body.title !== undefined) {
      await sql`UPDATE kanban_tasks SET title = ${body.title}, updated_at = ${now} WHERE id = ${id}`;
    }
    if (body.description !== undefined) {
      await sql`UPDATE kanban_tasks SET description = ${body.description || null}, updated_at = ${now} WHERE id = ${id}`;
    }
    if (body.assignee !== undefined) {
      await sql`UPDATE kanban_tasks SET assignee = ${body.assignee || null}, updated_at = ${now} WHERE id = ${id}`;
    }
    if (body.priority !== undefined) {
      await sql`UPDATE kanban_tasks SET priority = ${body.priority}, updated_at = ${now} WHERE id = ${id}`;
    }
    if (body.column !== undefined) {
      await sql`UPDATE kanban_tasks SET "column" = ${body.column}, updated_at = ${now} WHERE id = ${id}`;
    }
    if (body.tags !== undefined) {
      await sql`UPDATE kanban_tasks SET tags = ${body.tags}, updated_at = ${now} WHERE id = ${id}`;
    }

    // Fetch the updated task
    const rows = await sql`
      SELECT id, title, description, assignee, priority, "column", tags, created_at, updated_at
      FROM kanban_tasks
      WHERE id = ${id}
    `;

    const row = rows[0];
    const task = {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      assignee: row.assignee || undefined,
      priority: row.priority,
      column: row.column,
      tags: row.tags || [],
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };

    return NextResponse.json(task);
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const sql = getDb();
    const { id } = await params;

    const rows = await sql`
      DELETE FROM kanban_tasks
      WHERE id = ${id}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
