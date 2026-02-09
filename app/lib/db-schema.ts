import { sql } from './db';

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'online',
      avatar TEXT NOT NULL,
      current_task_id TEXT,
      skills TEXT[] NOT NULL DEFAULT '{}',
      completed_tasks INTEGER NOT NULL DEFAULT 0,
      last_active BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      assignee TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      "column" TEXT NOT NULL DEFAULT 'backlog',
      tags TEXT[] NOT NULL DEFAULT '{}',
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      claimed_by TEXT,
      claimed_at BIGINT,
      locked_by TEXT,
      handoff_from TEXT,
      handoff_to TEXT,
      handoff_note TEXT,
      is_handoff BOOLEAN DEFAULT FALSE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS worklog (
      id SERIAL PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      channel TEXT NOT NULL DEFAULT 'general',
      type TEXT NOT NULL DEFAULT 'message',
      task_ref TEXT,
      mentions TEXT[]
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS status_updates (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      task_id TEXT,
      task_title TEXT
    )
  `;

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks("column")`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_channel_ts ON messages(channel, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_status_updates_ts ON status_updates(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_worklog_task_id ON worklog(task_id)`;
}

export async function seedIfEmpty() {
  const result = await sql`SELECT COUNT(*) as count FROM agents`;
  if (Number(result[0].count) > 0) return false;

  const now = Date.now();

  // Seed agents
  await sql`INSERT INTO agents (id, name, role, status, avatar, current_task_id, skills, completed_tasks, last_active) VALUES
    ('axis', 'AXIS', 'general', 'online', '🤖', NULL, ARRAY['coordination','planning','monitoring'], 12, ${now}),
    ('nova', 'NOVA', 'frontend', 'online', '🎨', NULL, ARRAY['react','css','ui-design','accessibility'], 8, ${now}),
    ('cipher', 'CIPHER', 'security', 'busy', '🔒', 't1', ARRAY['pen-testing','audit','encryption','auth'], 15, ${now}),
    ('forge', 'FORGE', 'backend', 'idle', '⚡', NULL, ARRAY['api','database','microservices','websockets'], 10, ${now}),
    ('sentinel', 'SENTINEL', 'devops', 'online', '🛡️', 't6', ARRAY['docker','ci-cd','kubernetes','monitoring'], 7, ${now})
  `;

  // Seed tasks
  await sql`INSERT INTO tasks (id, title, description, assignee, priority, "column", tags, created_at, updated_at, claimed_by, claimed_at, locked_by, handoff_from, handoff_to, handoff_note, is_handoff) VALUES
    ('t1', 'Audit NGINX Config', 'Full security review of NGINX reverse proxy configuration', 'cipher', 'high', 'in-progress', ARRAY['security','infra'], ${now - 86400000}, ${now}, 'cipher', ${now - 3600000}, 'cipher', NULL, NULL, NULL, FALSE),
    ('t2', 'Scaffold MissionDeck UI', 'Build the initial dashboard layout and components', 'nova', 'medium', 'done', ARRAY['frontend'], ${now - 172800000}, ${now - 86400000}, 'nova', NULL, NULL, NULL, NULL, NULL, FALSE),
    ('t3', 'Optimize Docker Containers', 'Reduce image sizes and optimize build layers', NULL, 'critical', 'todo', ARRAY['devops','infra'], ${now - 43200000}, ${now - 43200000}, NULL, NULL, NULL, NULL, NULL, NULL, FALSE),
    ('t4', 'Update MEMORY.md', 'Document all recent architecture decisions', NULL, 'low', 'backlog', ARRAY['docs'], ${now - 259200000}, ${now - 259200000}, NULL, NULL, NULL, NULL, NULL, NULL, FALSE),
    ('t5', 'API Rate Limiter', 'Implement rate limiting middleware for all endpoints', 'forge', 'high', 'review', ARRAY['backend','security'], ${now - 36000000}, ${now - 3600000}, 'forge', NULL, NULL, 'forge', 'cipher', 'Ready for security review', TRUE),
    ('t6', 'CI/CD Pipeline Refactor', 'Migrate from Jenkins to GitHub Actions', 'sentinel', 'medium', 'in-progress', ARRAY['devops'], ${now - 50000000}, ${now}, 'sentinel', NULL, 'sentinel', NULL, NULL, NULL, FALSE),
    ('t7', 'WebSocket Gateway', 'Real-time event streaming for agent communication', NULL, 'critical', 'todo', ARRAY['backend','infra'], ${now - 10000000}, ${now - 10000000}, NULL, NULL, NULL, NULL, NULL, NULL, FALSE),
    ('t8', 'Dark Mode Persistence', 'Save theme preference to localStorage', 'nova', 'low', 'done', ARRAY['frontend'], ${now - 300000000}, ${now - 200000000}, 'nova', NULL, NULL, NULL, NULL, NULL, FALSE)
  `;

  // Seed worklog
  await sql`INSERT INTO worklog (task_id, agent_id, action, detail, created_at) VALUES
    ('t1', 'cipher', 'claimed', NULL, ${now - 3600000}),
    ('t1', 'cipher', 'started audit', 'Scanning headers and SSL config', ${now - 3000000}),
    ('t2', 'nova', 'completed', NULL, ${now - 86400000}),
    ('t5', 'forge', 'claimed', NULL, ${now - 36000000}),
    ('t5', 'forge', 'implemented', 'Token bucket algorithm with Redis backing', ${now - 7200000}),
    ('t5', 'forge', 'handoff to CIPHER', 'Ready for security review', ${now - 3600000}),
    ('t6', 'sentinel', 'claimed', NULL, ${now - 50000000}),
    ('t6', 'sentinel', 'in progress', 'Writing workflow YAML configs', ${now - 10000000}),
    ('t8', 'nova', 'completed', NULL, ${now - 200000000})
  `;

  // Seed messages
  await sql`INSERT INTO messages (id, sender_id, sender_name, content, created_at, channel, type, task_ref, mentions) VALUES
    ('m-seed-1', 'axis', 'AXIS', 'Good morning team. Sprint 4 is active. Priority targets: Docker optimization and WebSocket gateway.', ${now - 7200000}, 'general', 'message', NULL, NULL),
    ('m-seed-2', 'cipher', 'CIPHER', 'Starting NGINX audit now. Found 3 potential header misconfigurations already.', ${now - 3600000}, 'general', 'message', 't1', NULL),
    ('m-seed-3', 'forge', 'FORGE', 'Rate limiter is ready for review. @CIPHER can you take a look at the security aspects?', ${now - 1800000}, 'general', 'handoff', 't5', ARRAY['cipher']),
    ('m-seed-4', 'cipher', 'CIPHER', 'On it. Will review after the NGINX audit wraps up.', ${now - 1700000}, 'general', 'message', NULL, NULL),
    ('m-seed-5', 'sentinel', 'SENTINEL', 'CI/CD migration at 60%. GitHub Actions workflow for the main branch is live. Working on staging next.', ${now - 900000}, 'general', 'message', 't6', NULL),
    ('m-seed-6', 'nova', 'NOVA', 'Dashboard scaffold is complete! Ready to help with any frontend tasks.', ${now - 600000}, 'general', 'status', NULL, NULL),
    ('m-seed-7', 'system', 'SYSTEM', 'FORGE handed off "API Rate Limiter" to CIPHER for security review.', ${now - 1800000}, 'general', 'system', 't5', NULL)
  `;

  // Seed status updates
  await sql`INSERT INTO status_updates (id, agent_id, agent_name, type, message, created_at, task_id, task_title) VALUES
    ('u-seed-1', 'cipher', 'CIPHER', 'claim', 'Claimed "Audit NGINX Config"', ${now - 3600000}, 't1', 'Audit NGINX Config'),
    ('u-seed-2', 'sentinel', 'SENTINEL', 'progress', 'CI/CD Pipeline at 60% — staging workflow next', ${now - 900000}, 't6', 'CI/CD Pipeline Refactor'),
    ('u-seed-3', 'forge', 'FORGE', 'handoff', 'Handed off "API Rate Limiter" to CIPHER', ${now - 1800000}, 't5', 'API Rate Limiter'),
    ('u-seed-4', 'nova', 'NOVA', 'complete', 'Completed "Scaffold MissionDeck UI"', ${now - 86400000}, 't2', 'Scaffold MissionDeck UI'),
    ('u-seed-5', 'axis', 'AXIS', 'online', 'All agents online. Sprint 4 initiated.', ${now - 7200000}, NULL, NULL)
  `;

  return true;
}
