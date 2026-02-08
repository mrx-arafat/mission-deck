import { neon } from '@neondatabase/serverless';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.storage_DATABASE_URL || process.env.POSTGRES_URL || process.env.storage_POSTGRES_URL;
  if (!url) throw new Error('No database URL found. Set DATABASE_URL or connect Vercel Postgres storage.');
  return url;
}

export function getDb() {
  return neon(getDatabaseUrl());
}

export async function initializeDatabase() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS kanban_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      assignee TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      "column" TEXT NOT NULL DEFAULT 'backlog',
      tags TEXT[] DEFAULT '{}',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;
}
