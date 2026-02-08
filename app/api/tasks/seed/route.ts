import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/app/lib/db';

// POST /api/tasks/seed - Seed initial tasks if table is empty
export async function POST() {
  try {
    await initializeDatabase();
    const sql = getDb();

    // Check if tasks already exist
    const existing = await sql`SELECT COUNT(*) as count FROM kanban_tasks`;
    if (Number(existing[0].count) > 0) {
      return NextResponse.json({ message: 'Tasks already exist, skipping seed', count: Number(existing[0].count) });
    }

    const now = Date.now();
    const seeds = [
      { id: 't1', title: 'Audit NGINX Config', description: 'Full security review of NGINX reverse proxy configuration', assignee: 'AXIS', priority: 'high', column: 'in-progress', tags: ['security', 'infra'], createdAt: now - 86400000, updatedAt: now },
      { id: 't2', title: 'Scaffold MissionDeck UI', description: 'Build the initial dashboard layout and components', assignee: 'AXIS', priority: 'medium', column: 'done', tags: ['frontend'], createdAt: now - 172800000, updatedAt: now - 86400000 },
      { id: 't3', title: 'Optimize Docker Containers', description: 'Reduce image sizes and optimize build layers', assignee: 'AXIS', priority: 'critical', column: 'todo', tags: ['devops', 'infra'], createdAt: now - 43200000, updatedAt: now - 43200000 },
      { id: 't4', title: 'Update MEMORY.md', description: 'Document all recent architecture decisions', assignee: null, priority: 'low', column: 'backlog', tags: ['docs'], createdAt: now - 259200000, updatedAt: now - 259200000 },
      { id: 't5', title: 'API Rate Limiter', description: 'Implement rate limiting middleware for all endpoints', assignee: 'AXIS', priority: 'high', column: 'review', tags: ['backend', 'security'], createdAt: now - 36000000, updatedAt: now - 3600000 },
      { id: 't6', title: 'CI/CD Pipeline Refactor', description: 'Migrate from Jenkins to GitHub Actions', assignee: 'AXIS', priority: 'medium', column: 'in-progress', tags: ['devops'], createdAt: now - 50000000, updatedAt: now },
      { id: 't7', title: 'WebSocket Gateway', description: 'Real-time event streaming for agent communication', assignee: null, priority: 'critical', column: 'todo', tags: ['backend', 'infra'], createdAt: now - 10000000, updatedAt: now - 10000000 },
      { id: 't8', title: 'Dark Mode Persistence', description: 'Save theme preference to localStorage', assignee: 'AXIS', priority: 'low', column: 'done', tags: ['frontend'], createdAt: now - 300000000, updatedAt: now - 200000000 },
    ];

    for (const task of seeds) {
      await sql`
        INSERT INTO kanban_tasks (id, title, description, assignee, priority, "column", tags, created_at, updated_at)
        VALUES (${task.id}, ${task.title}, ${task.description}, ${task.assignee}, ${task.priority}, ${task.column}, ${task.tags}, ${task.createdAt}, ${task.updatedAt})
      `;
    }

    return NextResponse.json({ message: 'Seeded successfully', count: seeds.length });
  } catch (error) {
    console.error('Failed to seed tasks:', error);
    return NextResponse.json({ error: 'Failed to seed tasks' }, { status: 500 });
  }
}
