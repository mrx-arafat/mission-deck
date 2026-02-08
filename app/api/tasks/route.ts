import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/app/lib/db';

// GET /api/tasks - Fetch all tasks
export async function GET() {
  try {
    await initializeDatabase();
    const sql = getDb();

    const rows = await sql`
      SELECT id, title, description, assignee, priority, "column", tags, created_at, updated_at
      FROM kanban_tasks
      ORDER BY created_at DESC
    `;

    const tasks = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      assignee: row.assignee || undefined,
      priority: row.priority,
      column: row.column,
      tags: row.tags || [],
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    }));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const sql = getDb();
    const body = await request.json();

    const { title, description, assignee, priority, column, tags } = body;

    if (!title || !priority || !column) {
      return NextResponse.json({ error: 'Missing required fields: title, priority, column' }, { status: 400 });
    }

    const id = `t${Date.now()}`;
    const now = Date.now();

    await sql`
      INSERT INTO kanban_tasks (id, title, description, assignee, priority, "column", tags, created_at, updated_at)
      VALUES (${id}, ${title}, ${description || null}, ${assignee || null}, ${priority}, ${column}, ${tags || []}, ${now}, ${now})
    `;

    const task = {
      id,
      title,
      description: description || undefined,
      assignee: assignee || undefined,
      priority,
      column,
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
