# MissionDeck

**Mission Control for your AI Agent Army.**

A cyberpunk-themed Kanban task management dashboard with full database persistence and multi-agent authentication. Built with Next.js, Tailwind CSS, and Vercel Postgres (Neon).

## Features

- **Kanban Board** - Drag-and-drop task management across 5 columns: Backlog, Queued, Active, Review, Complete
- **Multi-Agent Auth** - Each AI agent gets its own credentials with persistent 90-day sessions
- **Full CRUD** - Create, read, update, and delete tasks with real-time persistence to Postgres
- **Optimistic Updates** - Instant UI feedback with automatic rollback on errors
- **Search & Filters** - Filter tasks by priority, assignee, or free-text search
- **Cyberpunk UI** - JARVIS-inspired dark theme with grid backgrounds, scanlines, and glow effects

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Vercel Postgres (Neon) |
| DB Driver | @neondatabase/serverless |
| Auth | Cookie-based HMAC-SHA256 sessions (90-day expiry) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Deployment | Vercel |

## Project Structure

```
app/
  api/
    auth/
      login/route.ts      # POST - authenticate and set session cookie
      logout/route.ts     # POST - clear session cookie
    tasks/
      route.ts            # GET (list) + POST (create) tasks
      [id]/route.ts       # PATCH (update) + DELETE tasks
      seed/route.ts       # POST - seeds initial data if empty
  components/
    KanbanBoard.tsx       # Main Kanban board with drag-and-drop
    MissionControl.tsx    # Header + layout wrapper
  lib/
    auth.ts               # Auth utilities (hashing, sessions)
    db.ts                 # Neon database connection + table init
  login/page.tsx          # Login page
  page.tsx                # Entry point
  layout.tsx              # Root layout
  globals.css             # Cyberpunk theme styles
middleware.ts             # Route protection (redirects to /login)
users.json                # User credentials (salted SHA-256 hashes)
scripts/
  manage-users.ts         # CLI to add/remove/list agent credentials
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Vercel Postgres (Neon) database

### Setup

1. Clone the repository:
```bash
git clone https://github.com/mrx-arafat/mission-deck.git
cd mission-deck
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your credentials:
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
POSTGRES_URL=postgresql://user:password@host/dbname?sslmode=require
AUTH_SECRET=<your-random-secret-here>
```

Generate an auth secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Manage agent credentials:
```bash
# Add a new agent
npx tsx scripts/manage-users.ts add <username> <password>

# List all agents
npx tsx scripts/manage-users.ts list

# Remove an agent
npx tsx scripts/manage-users.ts remove <username>
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) - you'll be redirected to the login page. The database table and seed data are created automatically on first load after login.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Authenticate agent, set 90-day session cookie |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/tasks` | Fetch all tasks |
| POST | `/api/tasks` | Create a new task |
| PATCH | `/api/tasks/:id` | Update a task (partial updates) |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/tasks/seed` | Seed sample data (only if table is empty) |

## Database Schema

```sql
CREATE TABLE kanban_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  "column" TEXT NOT NULL DEFAULT 'backlog',
  tags TEXT[] DEFAULT '{}',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

## Deploy to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Add a Postgres database from the Vercel Storage tab
4. Add `AUTH_SECRET` environment variable in project settings
5. Deploy

**Note:** The hashed passwords in `users.json` are safe to commit (salted SHA-256 hashes, not plaintext). Manage users locally and commit the updated file.

## License

MIT
