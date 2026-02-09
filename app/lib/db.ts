import { neon } from '@neondatabase/serverless';

function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.storage_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.storage_POSTGRES_URL;
  if (!url) throw new Error('No database URL found in environment variables');
  return url;
}

export const sql = neon(getDatabaseUrl());
