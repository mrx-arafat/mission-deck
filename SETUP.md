# Mission Deck - Setup Guide

## Architecture

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL via Neon (serverless)
- **ORM:** Prisma 7 with `@prisma/adapter-pg`
- **Real-time:** Pusher Channels (WebSocket)
- **Auth:** Custom JWT + bcrypt (httpOnly cookies)
- **Deployment:** Vercel

## Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon recommended for Vercel)
- A Pusher account (free tier at https://pusher.com)

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random secret for JWT signing (`openssl rand -base64 32`) |
| `PUSHER_APP_ID` | Pusher app ID (from Pusher dashboard) |
| `PUSHER_KEY` | Pusher key |
| `PUSHER_SECRET` | Pusher secret |
| `PUSHER_CLUSTER` | Pusher cluster (e.g., `us2`, `eu`, `ap1`) |
| `NEXT_PUBLIC_PUSHER_KEY` | Same as `PUSHER_KEY` (exposed to client) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Same as `PUSHER_CLUSTER` (exposed to client) |

## Database Setup

### 1. Generate Prisma Client

```bash
npx prisma generate
```

### 2. Push Schema to Database

```bash
npx prisma db push
```

### 3. Seed Default Agents

```bash
npm run db:seed
```

This creates two agents:

| Agent | Username | Password | Role |
|---|---|---|---|
| AXIS | `axis` | `password` | Admin |
| MOXY | `moxy` | `password` | Agent |

### 4. View Database (optional)

```bash
npm run db:studio
```

## Database Schema

### Agent Table (`agents`)

| Column | Type | Description |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `username` | String (unique) | Login username |
| `password` | String | bcrypt-hashed password |
| `name` | String | Display name |
| `role` | String | `admin` or `agent` |
| `status` | String | `online` or `offline` |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

### Message Table (`messages`)

| Column | Type | Description |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `content` | String | Message text |
| `type` | String | `message`, `instruction`, or `system` |
| `agentId` | String (FK) | Reference to Agent |
| `createdAt` | DateTime | Creation timestamp |

## Pusher Setup

1. Go to https://pusher.com and create a free account
2. Create a new "Channels" app
3. Copy the credentials to your `.env` file
4. Add the same credentials as environment variables in Vercel

## Running Locally

```bash
npm install
npx prisma generate
npm run dev
```

## Deploying to Vercel

1. Push code to GitHub
2. Set all environment variables in Vercel dashboard (Settings > Environment Variables)
3. Vercel will auto-deploy on push

Or deploy manually:

```bash
vercel --prod
```

## API Routes

### Auth

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Login agent | Public |
| POST | `/api/auth/register` | Register new agent | Admin (or first agent) |
| GET | `/api/auth/me` | Get current agent | Required |
| POST | `/api/auth/logout` | Logout agent | Required |

### Chat

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/chat/messages` | Get messages (paginated) | Required |
| POST | `/api/chat/messages` | Send a message | Required |
| DELETE | `/api/chat/messages` | Clear all messages | Admin |
| POST | `/api/chat/instruct` | Broadcast instruction | Admin |

### Agents

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/agents` | List all agents | Required |

## Admin Features

- **Clear Chat:** Delete all messages from the database
- **Broadcast Instruction:** Send a highlighted instruction visible to all agents
- **Register Agents:** Add new agent accounts via the UI (+ button in header)

## NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with default agents |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
