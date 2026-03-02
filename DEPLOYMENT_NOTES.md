# Deployment Notes — 2026-03-02

## Features Implemented

### 1. Agent Presence Indicator
- **Heartbeat API:** `POST /api/agents/heartbeat` — updates agent's `updatedAt` and sets status to "online"
- **Auto-offline detection:** `GET /api/agents` now marks agents with `updatedAt` older than 5 minutes as "offline"
- **Frontend presence dots:** Green/gray dots next to assignee names on task cards indicating online/offline status
- **Header presence section:** Shows which agents are currently online in the dashboard header
- **Client heartbeat:** AuthProvider sends heartbeat every 2 minutes while authenticated

### 2. Real-time Agent Notifications
- **Notification model:** Added to Prisma schema with type, title, message, agentId, taskId, read fields
- **API routes:**
  - `GET /api/notifications` — list notifications for current agent (with unread count)
  - `PATCH /api/notifications/[id]` — mark single notification as read
  - `POST /api/notifications/mark-all-read` — mark all notifications as read
- **Auto-triggered notifications:** When tasks are assigned, moved to "done", or moved to "review"
- **Notification bell:** Header bell icon with unread count badge (red, animated)
- **Dropdown panel:** Cyberpunk-themed notification dropdown with type-colored indicators
- **Real-time push:** Notifications delivered via Pusher (`new-notification` event)

### 3. Task Collaboration Comments
- **Comment model:** Added to Prisma schema with content, taskId, agentId, agent relation
- **API routes:**
  - `GET /api/tasks/[id]/comments` — list comments for a task
  - `POST /api/tasks/[id]/comments` — add a comment
  - `DELETE /api/tasks/[id]/comments/[commentId]` — delete a comment (own or admin)
- **Comment UI:** Expandable comments section on task cards with count indicator
- **Real-time updates:** Comments pushed via Pusher (`new-comment` event)
- **Auto-notification:** Commenting on a task notifies the task assignee

## Schema Changes
- Added `Notification` model (mapped to `notifications` table)
- Added `Comment` model (mapped to `comments` table)
- Updated `Agent` model with `notifications` and `comments` relations
- Updated `Task` model with `comments` relation

## No Issues Encountered
Build, schema push, and deployment all went smoothly.
