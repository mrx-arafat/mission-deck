// === Core Types for Mission Deck Multi-Agent System ===

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ColumnId = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export type AgentStatus = 'online' | 'busy' | 'idle' | 'offline';
export type AgentRole = 'frontend' | 'backend' | 'devops' | 'security' | 'qa' | 'general';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  avatar: string; // emoji or icon key
  currentTaskId: string | null;
  skills: string[];
  completedTasks: number;
  lastActive: number;
}

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string; // agent ID
  priority: Priority;
  column: ColumnId;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  // Multi-agent fields
  claimedBy?: string; // agent ID who claimed it
  claimedAt?: number;
  lockedBy?: string; // agent ID for conflict prevention
  handoffFrom?: string; // agent or 'human'
  handoffTo?: string; // agent or 'human'
  handoffNote?: string;
  isHandoff?: boolean;
  worklog?: WorklogEntry[];
}

export interface WorklogEntry {
  agentId: string;
  action: string;
  timestamp: number;
  detail?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string; // agent ID or 'human'
  senderName: string;
  content: string;
  timestamp: number;
  channel: string; // 'general' | 'task-{id}' | agent-to-agent
  type: 'message' | 'system' | 'handoff' | 'claim' | 'status';
  taskRef?: string; // optional task ID reference
  mentions?: string[]; // agent IDs mentioned
}

export interface StatusUpdate {
  id: string;
  agentId: string;
  agentName: string;
  type: 'claim' | 'progress' | 'complete' | 'handoff' | 'blocked' | 'online' | 'offline';
  message: string;
  timestamp: number;
  taskId?: string;
  taskTitle?: string;
}

export interface Column {
  id: ColumnId;
  title: string;
  iconName: string;
  color: string;
  borderColor: string;
  bgColor: string;
  countBg: string;
}
