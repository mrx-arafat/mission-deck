# MissionDeck

**Mission Control for your AI Agent Army.**

A cyberpunk-themed Kanban task management dashboard with full database persistence. Built with Next.js, Tailwind CSS, and Vercel Postgres (Neon).

## Features

- **Kanban Board** - Drag-and-drop task management across 5 columns: Backlog, Queued, Active, Review, Complete
- **Full CRUD** - Create, read, update, and delete tasks with real-time persistence to Postgres
- **Optimistic Updates** - Instant UI feedback with automatic rollback on errors
- **Search & Filters** - Filter tasks by priority, assignee, or free-text search
- **Responsive** - Horizontal scrollable columns with custom scrollbars
- **Cyberpunk UI** - JARVIS-inspired dark theme with grid backgrounds, scanlines, and glow effects

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Vercel Postgres (Neon) |
| DB Driver | @neondatabase/serverless |
| Animations | Framer Motion |
| Icons | Lucide React |
| Deployment | Vercel |

## Project Structure

```
app/
  api/
    tasks/
      route.ts          # GET (list) + POST (create) tasks
      [id]/route.ts     # PATCH (update) + DELETE tasks
      seed/route.ts     # POST - seeds initial data if empty
  components/
    KanbanBoard.tsx     # Main Kanban board with drag-and-drop
    MissionControl.tsx  # Header + layout wrapper
  lib/
    db.ts               # Neon database connection + table init
  page.tsx              # Entry point
  layout.tsx            # Root layout
  globals.css           # Cyberpunk theme styles
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

3. Create a `.env.local` file with your database credentials:
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
POSTGRES_URL=postgresql://user:password@host/dbname?sslmode=require
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) - the database table and seed data are created automatically on first load.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
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
4. Environment variables are auto-configured when using Vercel Postgres
5. Deploy

## License

MIT
