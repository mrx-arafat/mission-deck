'use client';

import React, { useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';

// --- Types ---
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ColumnId = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  priority: Priority;
  column: ColumnId;
  tags: string[];
  createdAt: number;
  updatedAt: number;
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

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  critical: { label: 'CRITICAL', color: 'text-red-400 border-red-800 bg-red-950/30', dot: 'bg-red-500' },
  high: { label: 'HIGH', color: 'text-orange-400 border-orange-800 bg-orange-950/30', dot: 'bg-orange-500' },
  medium: { label: 'MED', color: 'text-yellow-400 border-yellow-800 bg-yellow-950/30', dot: 'bg-yellow-500' },
  low: { label: 'LOW', color: 'text-gray-400 border-gray-700 bg-gray-900/30', dot: 'bg-gray-500' },
};

const AGENTS = ['AXIS', 'ORACLE', 'TANK', 'MORPHEUS', 'SHURI'];

const INITIAL_TASKS: KanbanTask[] = [
  { id: 't1', title: 'Audit NGINX Config', description: 'Full security review of NGINX reverse proxy configuration', assignee: 'AXIS', priority: 'high', column: 'in-progress', tags: ['security', 'infra'], createdAt: Date.now() - 86400000, updatedAt: Date.now() },
  { id: 't2', title: 'Scaffold MissionDeck UI', description: 'Build the initial dashboard layout and components', assignee: 'TANK', priority: 'medium', column: 'done', tags: ['frontend'], createdAt: Date.now() - 172800000, updatedAt: Date.now() - 86400000 },
  { id: 't3', title: 'Optimize Docker Containers', description: 'Reduce image sizes and optimize build layers', assignee: 'AXIS', priority: 'critical', column: 'todo', tags: ['devops', 'infra'], createdAt: Date.now() - 43200000, updatedAt: Date.now() - 43200000 },
  { id: 't4', title: 'Update MEMORY.md', description: 'Document all recent architecture decisions', priority: 'low', column: 'backlog', tags: ['docs'], createdAt: Date.now() - 259200000, updatedAt: Date.now() - 259200000 },
  { id: 't5', title: 'API Rate Limiter', description: 'Implement rate limiting middleware for all endpoints', assignee: 'MORPHEUS', priority: 'high', column: 'review', tags: ['backend', 'security'], createdAt: Date.now() - 36000000, updatedAt: Date.now() - 3600000 },
  { id: 't6', title: 'CI/CD Pipeline Refactor', description: 'Migrate from Jenkins to GitHub Actions', assignee: 'ORACLE', priority: 'medium', column: 'in-progress', tags: ['devops'], createdAt: Date.now() - 50000000, updatedAt: Date.now() },
  { id: 't7', title: 'WebSocket Gateway', description: 'Real-time event streaming for agent communication', priority: 'critical', column: 'todo', tags: ['backend', 'infra'], createdAt: Date.now() - 10000000, updatedAt: Date.now() - 10000000 },
  { id: 't8', title: 'Dark Mode Persistence', description: 'Save theme preference to localStorage', assignee: 'SHURI', priority: 'low', column: 'done', tags: ['frontend'], createdAt: Date.now() - 300000000, updatedAt: Date.now() - 200000000 },
];

// --- Component ---
export default function KanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_TASKS);
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
  const dragCounter = useRef(0);

  // --- Drag & Drop ---
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    // Make the drag image slightly transparent
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

  const handleDrop = useCallback((e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, column: columnId, updatedAt: Date.now() } : t
        )
      );
    }
    setDraggedTask(null);
    setDropTarget(null);
    dragCounter.current = 0;
  }, []);

  // --- CRUD ---
  const addTask = useCallback((task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: KanbanTask = {
      ...task,
      id: `t${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setTasks(prev => [...prev, newTask]);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<KanbanTask>) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
      )
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (editingTask === taskId) setEditingTask(null);
    if (expandedTask === taskId) setExpandedTask(null);
  }, [editingTask, expandedTask]);

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
        const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.column === 'done').length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search */}
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

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs border rounded px-2.5 py-1.5 transition-all ${
              showFilters || filterPriority !== 'all' || filterAssignee !== 'all'
                ? 'border-cyan-700 text-cyan-400 bg-cyan-950/20'
                : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            FILTER
            {(filterPriority !== 'all' || filterAssignee !== 'all') && (
              <span className="ml-1 bg-cyan-800/50 text-cyan-300 px-1.5 rounded text-[10px]">ON</span>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>{completedTasks}/{totalTasks} COMPLETE</span>
          <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
            <div className="flex items-center gap-3 p-2.5 bg-gray-900/30 border border-gray-800 rounded text-xs">
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

              <label className="text-gray-500 ml-2">Assignee:</label>
              <select
                value={filterAssignee}
                onChange={e => setFilterAssignee(e.target.value)}
                className="bg-black border border-gray-700 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-cyan-700"
              >
                <option value="all">All</option>
                {AGENTS.map(a => (
                  <option key={a} value={a}>{a}</option>
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
      <div className="flex-1 flex gap-3 overflow-x-auto overflow-y-hidden pb-2 kanban-scroll">
        {COLUMNS.map(column => {
          const columnTasks = getColumnTasks(column.id);
          const isDropping = dropTarget === column.id && draggedTask !== null;

          return (
            <div
              key={column.id}
              className={`kanban-column flex flex-col min-w-[220px] flex-1 rounded-lg border transition-all duration-200 ${
                isDropping
                  ? `${column.borderColor} border-opacity-100 ring-1 ring-cyan-500/30 ${column.bgColor}`
                  : 'border-gray-800/50 bg-black/20'
              }`}
              onDragEnter={e => handleDragEnter(e, column.id)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, column.id)}
            >
              {/* Column Header */}
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

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 kanban-column-scroll">
                <AnimatePresence mode="popLayout">
                  {columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isEditing={editingTask === task.id}
                      isExpanded={expandedTask === task.id}
                      isDragging={draggedTask === task.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onEdit={() => setEditingTask(editingTask === task.id ? null : task.id)}
                      onExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
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

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddTaskModal
            column={addToColumn}
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
  isEditing: boolean;
  isExpanded: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onEdit: () => void;
  onExpand: () => void;
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void;
  onDelete: (id: string) => void;
}

function TaskCard({
  task,
  isEditing,
  isExpanded,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onExpand,
  onUpdate,
  onDelete,
}: TaskCardProps) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editAssignee, setEditAssignee] = useState(task.assignee || '');
  const [editTags, setEditTags] = useState(task.tags.join(', '));

  const pri = PRIORITY_CONFIG[task.priority];

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
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
    >
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`group relative bg-black/50 border border-gray-800 rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:border-gray-700 transition-all ${
        isExpanded ? 'ring-1 ring-cyan-900/50' : ''
      }`}
    >
      {/* Drag Handle + Priority Dot */}
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <GripVertical className="w-3 h-3 text-gray-700 group-hover:text-gray-500" />
          <div className={`w-2 h-2 rounded-full ${pri.dot}`} title={pri.label} />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            /* Edit Mode */
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
                  {AGENTS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
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
            /* View Mode */
            <>
              <div
                className="text-xs font-medium text-gray-200 leading-snug cursor-pointer hover:text-cyan-300 transition-colors"
                onClick={onExpand}
              >
                {task.title}
              </div>

              {/* Expanded Details */}
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

              {/* Tags */}
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

              {/* Footer */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  {task.assignee && (
                    <span className="text-[10px] text-cyan-600 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      {task.assignee}
                    </span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${pri.color}`}>
                    {pri.label}
                  </span>
                </div>

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
  onAdd: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

function AddTaskModal({ column, onAdd, onClose }: AddTaskModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-950 border border-cyan-900/50 rounded-lg p-5 w-full max-w-md shadow-2xl shadow-cyan-900/10"
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

          <div className="grid grid-cols-3 gap-3">
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
                {AGENTS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
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
