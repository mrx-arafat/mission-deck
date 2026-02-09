import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, role, status, avatar, current_task_id, skills, completed_tasks, last_active
      FROM agents ORDER BY name
    `;
    const agents = rows.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      status: r.status,
      avatar: r.avatar,
      currentTaskId: r.current_task_id,
      skills: r.skills || [],
      completedTasks: Number(r.completed_tasks),
      lastActive: Number(r.last_active),
    }));
    return NextResponse.json(agents);
  } catch (error) {
    console.error('GET /api/agents error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
