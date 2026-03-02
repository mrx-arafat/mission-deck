'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  GripVertical,
  Trash2,
  Edit3,
  X,
  Check,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  Filter,
  Search,
  Loader2,
  MessageCircle,
  Send,
  Lock,
  Unlock,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { getPusherClient, CHAT_CHANNEL, EVENTS } from '@/lib/pusher';

// --- Types ---
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ColumnId = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export interface KanbanTask {
  id: string;
  title: string;
  description?: string | null;
  assignee?: string | null;
  priority: string;
  column: string;
  tags: string[];
  claimedBy?: string | null;
  claimedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  status: string;
  capabilities?: string[];
}

interface Comment {
  id: string;
  content: string;
  taskId: string;
  agentId: string;
  agent: { id: string; name: string; username: string };
  createdAt: string;
}

interface Column {
  id: ColumnId;
  title: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  countBg: string;
}

// --- Constants ---
const COLUMNS: Column[] = [
  {
    id: 'backlog',
    title: 'BACKLOG',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-gray-400',
    borderColor: 'border-gray-700',
    bgColor: 'bg-gray-900/20',
    countBg: 'bg-gray-800 text-gray-400',
  },
  {
    id: 'todo',
    title: 'QUEUED',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-900/50',
    bgColor: 'bg-yellow-950/10',
    countBg: 'bg-yellow-900/30 text-yellow-400',
  },
  {
    id: 'in-progress',
    title: 'ACTIVE',
    icon: <ArrowRight className="w-4 h-4" />,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-900/50',
    bgColor: 'bg-cyan-950/10',
    countBg: 'bg-cyan-900/30 text-cyan-400',
  },
  {
    id: 'review',
    title: 'REVIEW',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-purple-400',
    borderColor: 'border-purple-900/50',
    bgColor: 'bg-purple-950/10',
    countBg: 'bg-purple-900/30 text-purple-400',
  },
  {
    id: 'done',
    title: 'COMPLETE',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-400',
    borderColor: 'border-green-900/50',
    bgColor: 'bg-green-950/10',
    countBg: 'bg-green-900/30 text-green-400',
  },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  critical: { label: 'CRITICAL', color: 'text-red-400 border-red-800 bg-red-950/30', dot: 'bg-red-500' },
  high: { label: 'HIGH', color: 'text-orange-400 border-orange-800 bg-orange-950/30', dot: 'bg-orange-500' },
  medium: { label: 'MED', color: 'text-yellow-400 border-yellow-800 bg-yellow-950/30', dot: 'bg-yellow-500' },
  low: { label: 'LOW', color: 'text-gray-400 border-gray-700 bg-gray-900/30', dot: 'bg-gray-500' },
};

// --- Component ---
interface KanbanBoardProps {
  onlineAgents?: AgentInfo[];
}

export default function KanbanBoard({ onlineAgents = [] }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ColumnId | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addToColumn, setAddToColumn] = useState<ColumnId>('backlog');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const dragCounter = useRef(0);

  // Build a map of agent name -> online status
  const agentStatusMap = useCallback((name: string) => {
    const found = onlineAgents.find(a => a.name === name);
    return found?.status === 'online';
  }, [onlineAgents]);

  // --- Fetch tasks from DB ---
  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks);
        }
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  // --- Fetch agents for assignee dropdown ---
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents);
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      }
    }
    fetchAgents();
  }, []);

  // --- Real-time Pusher: task-claimed / task-unclaimed ---
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(CHAT_CHANNEL);

    const handleClaimed = (data: { taskId: string; agentId: string; agentName: string }) => {
      setTasks(prev =>
        prev.map(t =>
          t.id === data.taskId
            ? { ...t, claimedBy: data.agentId, claimedAt: new Date().toISOString(), assignee: data.agentName, column: 'in-progress' }
            : t
        )
      );
    };

    const handleUnclaimed = (data: { taskId: string }) => {
      setTasks(prev =>
        prev.map(t =>
          t.id === data.taskId
            ? { ...t, claimedBy: null, claimedAt: null, assignee: null, column: 'todo' }
            : t
        )
      );
    };

    channel.bind(EVENTS.TASK_CLAIMED, handleClaimed);
    channel.bind(EVENTS.TASK_UNCLAIMED, handleUnclaimed);

    return () => {
      channel.unbind(EVENTS.TASK_CLAIMED, handleClaimed);
      channel.unbind(EVENTS.TASK_UNCLAIMED, handleUnclaimed);
    };
  }, []);

  // --- Drag & Drop ---
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedTask(null);
    setDropTarget(null);
    dragCounter.current = 0;
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    dragCounter.current++;
    setDropTarget(columnId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDropTarget(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, column: columnId } : t
        )
      );
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column: columnId }),
        });
      } catch (err) {
        console.error('Failed to move task:', err);
      }
    }
    setDraggedTask(null);
    setDropTarget(null);
    dragCounter.current = 0;
  }, []);

  // --- CRUD ---
  const addTask = useCallback(async (task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(prev => [...prev, data.task]);
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<KanbanTask>) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    );
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (editingTask === taskId) setEditingTask(null);
    if (expandedTask === taskId) setExpandedTask(null);
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [editingTask, expandedTask]);

  // Update comment count
  const updateCommentCount = useCallback((taskId: string, count: number) => {
    setCommentCounts(prev => ({ ...prev, [taskId]: count }));
  }, []);

  // --- Filtering ---
  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !task.title.toLowerCase().includes(q) &&
        !task.description?.toLowerCase().includes(q) &&
        !task.assignee?.toLowerCase().includes(q) &&
        !task.tags.some(t => t.toLowerCase().includes(q))
      ) {
        return false;
      }
    }
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (filterAssignee !== 'all' && task.assignee !== filterAssignee) return false;
    return true;
  });

  const getColumnTasks = (columnId: ColumnId) =>
    filteredTasks
      .filter(t => t.column === columnId)
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
      });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.column === 'done').length;
  const assigneeNames = [...new Set(tasks.map(t => t.assignee).filter(Boolean))] as string[];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-cyan-600 animate-spin" />
          <span className="text-xs text-gray-600 tracking-wider">LOADING MISSIONS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-black/40 border border-gray-800 rounded px-2.5 pl-8 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-800 transition-colors placeholder:text-gray-700"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs border rounded px-2 md:px-2.5 py-1.5 transition-all shrink-0 ${
              showFilters || filterPriority !== 'all' || filterAssignee !== 'all'
                ? 'border-cyan-700 text-cyan-400 bg-cyan-950/20'
                : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">FILTER</span>
            {(filterPriority !== 'all' || filterAssignee !== 'all') && (
              <span className="ml-1 bg-cyan-800/50 text-cyan-300 px-1.5 rounded text-[10px]">ON</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-3 text-[10px] text-gray-500 shrink-0">
          <span>{completedTasks}/{totalTasks} COMPLETE</span>
          <div className="w-16 md:w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500/70 transition-all duration-500 rounded-full"
              style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex flex-wrap items-center gap-2 md:gap-3 p-2.5 bg-gray-900/30 border border-gray-800 rounded text-xs">
              <label className="text-gray-500">Priority:</label>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value as Priority | 'all')}
                className="bg-black border border-gray-700 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-cyan-700"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <label className="text-gray-500">Assignee:</label>
              <select
                value={filterAssignee}
                onChange={e => setFilterAssignee(e.target.value)}
                className="bg-black border border-gray-700 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-cyan-700"
              >
                <option value="all">All</option>
                {assigneeNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="">Unassigned</option>
              </select>

              <button
                onClick={() => {
                  setFilterPriority('all');
                  setFilterAssignee('all');
                  setSearchQuery('');
                }}
                className="ml-auto text-gray-500 hover:text-gray-300 text-xs"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Columns */}
      <div className="flex-1 flex gap-2 md:gap-3 overflow-x-auto overflow-y-hidden pb-2 kanban-scroll">
        {COLUMNS.map(column => {
          const columnTasks = getColumnTasks(column.id);
          const isDropping = dropTarget === column.id && draggedTask !== null;

          return (
            <div
              key={column.id}
              className={`kanban-column flex flex-col min-w-[180px] md:min-w-[220px] flex-1 rounded-lg border transition-all duration-200 ${
                isDropping
                  ? `${column.borderColor} border-opacity-100 ring-1 ring-cyan-500/30 ${column.bgColor}`
                  : 'border-gray-800/50 bg-black/20'
              }`}
              onDragEnter={e => handleDragEnter(e, column.id)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, column.id)}
            >
              <div className={`flex items-center justify-between px-3 py-2.5 border-b ${column.borderColor} bg-black/30 rounded-t-lg`}>
                <div className={`flex items-center gap-2 ${column.color}`}>
                  {column.icon}
                  <span className="text-[11px] font-bold tracking-wider">{column.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${column.countBg}`}>
                    {columnTasks.length}
                  </span>
                  <button
                    onClick={() => {
                      setAddToColumn(column.id);
                      setShowAddModal(true);
                    }}
                    className="text-gray-600 hover:text-cyan-400 transition-colors"
                    title="Add task"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 kanban-column-scroll">
                <AnimatePresence mode="popLayout">
                  {columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agents={agents}
                      isEditing={editingTask === task.id}
                      isExpanded={expandedTask === task.id}
                      isDragging={draggedTask === task.id}
                      isAssigneeOnline={task.assignee ? agentStatusMap(task.assignee) : false}
                      commentCount={commentCounts[task.id] || 0}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onEdit={() => setEditingTask(editingTask === task.id ? null : task.id)}
                      onExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                      onCommentCountUpdate={updateCommentCount}
                    />
                  ))}
                </AnimatePresence>

                {columnTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-700 text-xs">
                    <div className="border border-dashed border-gray-800 rounded-lg p-4 w-full text-center">
                      {draggedTask ? 'Drop here' : 'No tasks'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddTaskModal
            column={addToColumn}
            agents={agents}
            onAdd={task => {
              addTask(task);
              setShowAddModal(false);
            }}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Task Card ---
interface TaskCardProps {
  task: KanbanTask;
  agents: AgentInfo[];
  isEditing: boolean;
  isExpanded: boolean;
  isDragging: boolean;
  isAssigneeOnline: boolean;
  commentCount: number;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onEdit: () => void;
  onExpand: () => void;
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void;
  onDelete: (id: string) => void;
  onCommentCountUpdate: (taskId: string, count: number) => void;
}

function TaskCard({
  task,
  agents,
  isEditing,
  isExpanded,
  isDragging,
  isAssigneeOnline,
  commentCount,
  onDragStart,
  onDragEnd,
  onEdit,
  onExpand,
  onUpdate,
  onDelete,
  onCommentCountUpdate,
}: TaskCardProps) {
  const { agent: currentAgent } = useAuth();
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editAssignee, setEditAssignee] = useState(task.assignee || '');
  const [editTags, setEditTags] = useState(task.tags.join(', '));

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  // Claim state
  const isClaimedByMe = task.claimedBy === currentAgent?.id;
  const isClaimedByOther = !!task.claimedBy && !isClaimedByMe;
  const isClaimable = !task.claimedBy && (task.column === 'backlog' || task.column === 'todo');
  const [claiming, setClaiming] = useState(false);

  // Find agent capabilities for the assignee
  const assigneeAgent = agents.find(a => a.name === task.assignee);
  const assigneeCaps = assigneeAgent?.capabilities?.slice(0, 2) || [];

  async function handleClaim() {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/claim`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onUpdate(task.id, data.task);
      }
    } catch {} finally {
      setClaiming(false);
    }
  }

  async function handleUnclaim() {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/unclaim`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onUpdate(task.id, data.task);
      }
    } catch {} finally {
      setClaiming(false);
    }
  }

  // Fetch comments when expanded
  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  // Real-time comment updates via Pusher
  useEffect(() => {
    if (!showComments) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(CHAT_CHANNEL);
    const handler = (data: { taskId: string; comment: Comment }) => {
      if (data.taskId === task.id) {
        setComments(prev => {
          // Avoid duplicates
          if (prev.find(c => c.id === data.comment.id)) return prev;
          return [...prev, data.comment];
        });
        onCommentCountUpdate(task.id, comments.length + 1);
      }
    };
    channel.bind(EVENTS.NEW_COMMENT, handler);
    return () => { channel.unbind(EVENTS.NEW_COMMENT, handler); };
  }, [showComments, task.id, comments.length]);

  async function fetchComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        onCommentCountUpdate(task.id, data.comments?.length || 0);
      }
    } catch {} finally {
      setLoadingComments(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data.comment]);
        onCommentCountUpdate(task.id, comments.length + 1);
        setNewComment('');
      }
    } catch {} finally {
      setSubmittingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId));
    onCommentCountUpdate(task.id, Math.max(0, comments.length - 1));
    try {
      await fetch(`/api/tasks/${task.id}/comments/${commentId}`, { method: 'DELETE' });
    } catch {}
  }

  const saveEdit = () => {
    onUpdate(task.id, {
      title: editTitle,
      description: editDescription || undefined,
      priority: editPriority,
      assignee: editAssignee || undefined,
      tags: editTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    });
    onEdit();
  };

  const resetEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditAssignee(task.assignee || '');
    setEditTags(task.tags.join(', '));
    onEdit();
  };

  return (
    <div
      draggable={!isClaimedByOther}
      onDragStart={e => {
        if (isClaimedByOther) { e.preventDefault(); return; }
        onDragStart(e, task.id);
      }}
      onDragEnd={onDragEnd}
    >
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`group relative bg-black/50 border rounded-md p-2.5 transition-all ${
        isClaimedByOther
          ? 'border-orange-800/50 cursor-not-allowed opacity-80'
          : isClaimedByMe
          ? 'border-cyan-800/50 cursor-grab active:cursor-grabbing hover:border-cyan-700'
          : 'border-gray-800 cursor-grab active:cursor-grabbing hover:border-gray-700'
      } ${isExpanded ? 'ring-1 ring-cyan-900/50' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <GripVertical className="w-3 h-3 text-gray-700 group-hover:text-gray-500" />
          <div className={`w-2 h-2 rounded-full ${pri.dot}`} title={pri.label} />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-700"
                autoFocus
              />
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={2}
                placeholder="Description..."
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-cyan-700 resize-none"
              />
              <div className="flex gap-2">
                <select
                  value={editPriority}
                  onChange={e => setEditPriority(e.target.value as Priority)}
                  className="bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-[10px] text-gray-300 focus:outline-none"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={editAssignee}
                  onChange={e => setEditAssignee(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-[10px] text-gray-300 focus:outline-none flex-1"
                >
                  <option value="">Unassigned</option>
                  {[...agents]
                    .sort((a, b) => {
                      const aMatch = a.capabilities?.filter(c => task.tags.includes(c)).length || 0;
                      const bMatch = b.capabilities?.filter(c => task.tags.includes(c)).length || 0;
                      return bMatch - aMatch;
                    })
                    .map(a => {
                      const matchCount = a.capabilities?.filter(c => task.tags.includes(c)).length || 0;
                      return (
                        <option key={a.name} value={a.name}>
                          {matchCount > 0 ? '★ ' : ''}{a.name}{a.capabilities && a.capabilities.length > 0 ? ` [${a.capabilities.slice(0, 2).join(', ')}]` : ''}
                        </option>
                      );
                    })}
                </select>
              </div>
              <input
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-cyan-700"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={resetEdit}
                  className="text-[10px] px-2 py-1 border border-gray-700 rounded text-gray-400 hover:text-gray-200 hover:border-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
                <button
                  onClick={saveEdit}
                  className="text-[10px] px-2 py-1 border border-cyan-800 rounded text-cyan-400 hover:text-cyan-200 hover:border-cyan-600 bg-cyan-950/20"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="text-xs font-medium text-gray-200 leading-snug cursor-pointer hover:text-cyan-300 transition-colors"
                onClick={onExpand}
              >
                {task.title}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {task.description && (
                      <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 text-[9px] text-gray-600">
                      <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                      <span>|</span>
                      <span>Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {task.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-500 border border-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Claim badges */}
              {isClaimedByMe && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-cyan-700 bg-cyan-950/30 text-cyan-400 font-bold tracking-wider flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> CLAIMED BY YOU
                  </span>
                </div>
              )}
              {isClaimedByOther && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-orange-700 bg-orange-950/30 text-orange-400 font-bold tracking-wider flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> CLAIMED
                  </span>
                </div>
              )}

              {/* Footer with assignee presence dot */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {task.assignee && (
                    <span className="text-[10px] text-cyan-600 flex items-center gap-1">
                      <div className="relative">
                        <User className="w-2.5 h-2.5" />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black ${
                          isAssigneeOnline ? 'bg-green-500' : 'bg-gray-600'
                        }`} />
                      </div>
                      {task.assignee}
                      {task.claimedBy && <Lock className="w-2 h-2 text-gray-500" />}
                    </span>
                  )}
                  {/* Assignee capability badges */}
                  {assigneeCaps.map(cap => (
                    <span key={cap} className="text-[8px] px-1 py-0.5 rounded bg-cyan-950/30 text-cyan-600 border border-cyan-900/30">
                      {cap}
                    </span>
                  ))}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${pri.color}`}>
                    {pri.label}
                  </span>
                </div>

                <div className="flex gap-1 items-center">
                  {/* Comment count indicator */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowComments(!showComments);
                    }}
                    className={`flex items-center gap-0.5 text-[10px] p-0.5 transition-colors ${
                      showComments ? 'text-cyan-400' : 'text-gray-600 hover:text-gray-400'
                    }`}
                    title="Comments"
                  >
                    <MessageCircle className="w-3 h-3" />
                    {(commentCount > 0 || comments.length > 0) && (
                      <span>{comments.length || commentCount}</span>
                    )}
                  </button>

                  {/* Claim/Unclaim buttons */}
                  {isClaimable && (
                    <button
                      onClick={e => { e.stopPropagation(); handleClaim(); }}
                      disabled={claiming}
                      className="text-yellow-600 hover:text-yellow-400 transition-colors p-0.5"
                      title="Claim this task"
                    >
                      <Zap className="w-3 h-3" />
                    </button>
                  )}
                  {isClaimedByMe && (
                    <button
                      onClick={e => { e.stopPropagation(); handleUnclaim(); }}
                      disabled={claiming}
                      className="text-cyan-600 hover:text-cyan-400 transition-colors p-0.5"
                      title="Unclaim this task"
                    >
                      <Unlock className="w-3 h-3" />
                    </button>
                  )}

                  {/* Claim / Release buttons */}
                  {isClaimable && (
                    <button
                      onClick={e => { e.stopPropagation(); handleClaim(); }}
                      disabled={claiming}
                      className="text-[9px] px-1.5 py-0.5 rounded border border-cyan-800 text-cyan-400 hover:bg-cyan-950/30 transition-all flex items-center gap-0.5 disabled:opacity-40"
                      title="Claim this task"
                    >
                      {claiming ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Lock className="w-2.5 h-2.5" />}
                      CLAIM
                    </button>
                  )}
                  {isClaimedByMe && (
                    <button
                      onClick={e => { e.stopPropagation(); handleUnclaim(); }}
                      disabled={claiming}
                      className="text-[9px] px-1.5 py-0.5 rounded border border-orange-800 text-orange-400 hover:bg-orange-950/30 transition-all flex items-center gap-0.5 disabled:opacity-40"
                      title="Release this task"
                    >
                      {claiming ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Unlock className="w-2.5 h-2.5" />}
                      RELEASE
                    </button>
                  )}

                  {/* Actions (visible on hover) */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="text-gray-600 hover:text-cyan-400 transition-colors p-0.5"
                      title="Edit"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDelete(task.id);
                      }}
                      className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <AnimatePresence>
                {showComments && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-2 border-t border-gray-800 pt-2"
                  >
                    {loadingComments ? (
                      <div className="flex justify-center py-2">
                        <Loader2 className="w-3 h-3 animate-spin text-gray-600" />
                      </div>
                    ) : (
                      <>
                        {/* Comment list */}
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {comments.length === 0 ? (
                            <div className="text-[9px] text-gray-700 text-center py-1">No comments yet</div>
                          ) : (
                            comments.map(comment => (
                              <div key={comment.id} className="bg-gray-900/50 rounded px-2 py-1.5 group/comment">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-medium text-cyan-500">{comment.agent.name}</span>
                                    <span className="text-[8px] text-gray-700">
                                      {new Date(comment.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {(currentAgent?.id === comment.agentId || currentAgent?.role === 'admin') && (
                                    <button
                                      onClick={() => deleteComment(comment.id)}
                                      className="text-gray-700 hover:text-red-400 opacity-0 group-hover/comment:opacity-100 transition-all"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{comment.content}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add comment form */}
                        <form onSubmit={submitComment} className="flex gap-1.5 mt-2">
                          <input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Add comment..."
                            className="flex-1 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-cyan-800 placeholder:text-gray-700"
                            onClick={e => e.stopPropagation()}
                          />
                          <button
                            type="submit"
                            disabled={submittingComment || !newComment.trim()}
                            className="text-cyan-600 hover:text-cyan-400 disabled:text-gray-700 transition-colors p-1"
                            onClick={e => e.stopPropagation()}
                          >
                            {submittingComment ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                          </button>
                        </form>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
    </div>
  );
}

// --- Add Task Modal ---
interface AddTaskModalProps {
  column: ColumnId;
  agents: AgentInfo[];
  onAdd: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

function AddTaskModal({ column, agents, onAdd, onClose }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignee, setAssignee] = useState('');
  const [tags, setTags] = useState('');
  const [targetColumn, setTargetColumn] = useState<ColumnId>(column);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignee: assignee || undefined,
      column: targetColumn,
      tags: tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-950 border border-cyan-900/50 rounded-t-lg md:rounded-lg p-4 md:p-5 w-full max-w-md shadow-2xl shadow-cyan-900/10 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-cyan-400 tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4" /> NEW MISSION
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-700 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-cyan-700 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Assignee</label>
              <select
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
              >
                <option value="">None</option>
                {[...agents]
                  .sort((a, b) => {
                    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
                    const aMatch = a.capabilities?.filter(c => parsedTags.includes(c)).length || 0;
                    const bMatch = b.capabilities?.filter(c => parsedTags.includes(c)).length || 0;
                    return bMatch - aMatch;
                  })
                  .map(a => {
                    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
                    const matchCount = a.capabilities?.filter(c => parsedTags.includes(c)).length || 0;
                    return (
                      <option key={a.name} value={a.name}>
                        {matchCount > 0 ? '★ ' : ''}{a.name}{a.capabilities && a.capabilities.length > 0 ? ` [${a.capabilities.slice(0, 3).join(', ')}]` : ''}
                      </option>
                    );
                  })}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Column</label>
              <select
                value={targetColumn}
                onChange={e => setTargetColumn(e.target.value as ColumnId)}
                className="w-full bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700"
              >
                {COLUMNS.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Tags</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="security, backend, infra..."
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-cyan-700 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2 border border-gray-700 rounded text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="text-xs px-4 py-2 border border-cyan-700 rounded text-cyan-400 hover:text-cyan-200 hover:border-cyan-500 bg-cyan-950/30 transition-colors font-bold tracking-wider"
            >
              DEPLOY
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
