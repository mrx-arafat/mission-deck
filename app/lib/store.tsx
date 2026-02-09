'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type {
  Agent,
  KanbanTask,
  ChatMessage,
  StatusUpdate,
  AgentStatus,
  ColumnId,
} from './types';

// === API Helper ===
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// === Store Context ===
interface MissionStore {
  // State
  agents: Agent[];
  getAgent: (id: string) => Agent | undefined;
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;

  tasks: KanbanTask[];
  addTask: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (taskId: string, updates: Partial<KanbanTask>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, column: ColumnId) => void;
  claimTask: (taskId: string, agentId: string) => void;
  unclaimTask: (taskId: string) => void;
  handoffTask: (taskId: string, fromId: string, toId: string, note: string) => void;

  messages: ChatMessage[];
  sendMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;

  statusUpdates: StatusUpdate[];
  addStatusUpdate: (update: Omit<StatusUpdate, 'id' | 'timestamp'>) => void;

  simulationRunning: boolean;
  toggleSimulation: () => void;

  // DB status
  loading: boolean;
  dbConnected: boolean;
}

const MissionContext = createContext<MissionStore | null>(null);

export function useMissionStore() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error('useMissionStore must be used within MissionProvider');
  return ctx;
}

// === Simulation Engine ===
function useAgentSimulation(
  agents: Agent[],
  tasks: KanbanTask[],
  claimTask: (taskId: string, agentId: string) => void,
  sendMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void,
  addStatusUpdate: (update: Omit<StatusUpdate, 'id' | 'timestamp'>) => void,
  updateAgentStatus: (agentId: string, status: AgentStatus) => void,
  moveTask: (taskId: string, column: ColumnId) => void,
  running: boolean,
  dbReady: boolean
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionRef = useRef<number>(0);

  useEffect(() => {
    if (!running || !dbReady) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastActionRef.current < 12000) return; // min 12s between actions
      lastActionRef.current = now;

      const action = Math.random();

      // 30% chance: idle agent claims an unclaimed task
      if (action < 0.3) {
        const idleAgents = agents.filter(a => a.status !== 'offline' && !a.currentTaskId);
        const unclaimedTasks = tasks.filter(t => !t.claimedBy && (t.column === 'todo' || t.column === 'backlog'));
        if (idleAgents.length > 0 && unclaimedTasks.length > 0) {
          const agent = idleAgents[Math.floor(Math.random() * idleAgents.length)];
          const matchingTask = unclaimedTasks.find(t =>
            t.tags.some(tag => agent.skills.some(s => s.includes(tag) || tag.includes(s)))
          ) || unclaimedTasks[0];

          claimTask(matchingTask.id, agent.id);
          sendMessage({
            senderId: agent.id,
            senderName: agent.name,
            content: `Claiming "${matchingTask.title}" — matches my ${agent.role} expertise.`,
            channel: 'general',
            type: 'claim',
            taskRef: matchingTask.id,
          });
          addStatusUpdate({
            agentId: agent.id,
            agentName: agent.name,
            type: 'claim',
            message: `Claimed "${matchingTask.title}"`,
            taskId: matchingTask.id,
            taskTitle: matchingTask.title,
          });
        }
      }

      // 25% chance: agent posts a progress update
      if (action >= 0.3 && action < 0.55) {
        const busyAgents = agents.filter(a => a.currentTaskId);
        if (busyAgents.length > 0) {
          const agent = busyAgents[Math.floor(Math.random() * busyAgents.length)];
          const task = tasks.find(t => t.id === agent.currentTaskId);
          if (task) {
            const progressMessages = [
              `Making progress on "${task.title}". Running tests now.`,
              `"${task.title}" — about 70% done. No blockers.`,
              `Found an edge case in "${task.title}". Handling it now.`,
              `Almost done with "${task.title}". Wrapping up documentation.`,
              `"${task.title}" — pushing through the final integration steps.`,
            ];
            const msg = progressMessages[Math.floor(Math.random() * progressMessages.length)];
            sendMessage({
              senderId: agent.id,
              senderName: agent.name,
              content: msg,
              channel: 'general',
              type: 'message',
              taskRef: task.id,
            });
            addStatusUpdate({
              agentId: agent.id,
              agentName: agent.name,
              type: 'progress',
              message: msg,
              taskId: task.id,
              taskTitle: task.title,
            });
          }
        }
      }

      // 15% chance: agent moves a task forward
      if (action >= 0.55 && action < 0.7) {
        const inProgressTasks = tasks.filter(t => t.column === 'in-progress' && t.claimedBy);
        if (inProgressTasks.length > 0) {
          const task = inProgressTasks[Math.floor(Math.random() * inProgressTasks.length)];
          const agent = agents.find(a => a.id === task.claimedBy);
          if (agent) {
            moveTask(task.id, 'review');
            sendMessage({
              senderId: agent.id,
              senderName: agent.name,
              content: `Moved "${task.title}" to REVIEW. Ready for peer check.`,
              channel: 'general',
              type: 'message',
              taskRef: task.id,
            });
            addStatusUpdate({
              agentId: agent.id,
              agentName: agent.name,
              type: 'progress',
              message: `Moved "${task.title}" to review`,
              taskId: task.id,
              taskTitle: task.title,
            });
          }
        }
      }

      // 15% chance: status changes
      if (action >= 0.7 && action < 0.85) {
        const onlineAgents = agents.filter(a => a.status !== 'offline');
        if (onlineAgents.length > 0) {
          const agent = onlineAgents[Math.floor(Math.random() * onlineAgents.length)];
          const newStatus: AgentStatus = agent.status === 'busy' ? 'online' : agent.status === 'idle' ? 'busy' : 'idle';
          updateAgentStatus(agent.id, newStatus);
        }
      }

      // 15% chance: general team chat
      if (action >= 0.85) {
        const chatMessages = [
          { id: 'axis', name: 'AXIS', msg: 'Keep up the pace team. Sprint deadline in 2 days.' },
          { id: 'nova', name: 'NOVA', msg: 'Anyone need help with frontend? I have capacity.' },
          { id: 'forge', name: 'FORGE', msg: 'The new API endpoints are performing well. Latency under 50ms.' },
          { id: 'sentinel', name: 'SENTINEL', msg: 'All deployments green. Zero downtime on staging.' },
          { id: 'cipher', name: 'CIPHER', msg: 'Security scan complete. No critical vulnerabilities found.' },
        ];
        const chat = chatMessages[Math.floor(Math.random() * chatMessages.length)];
        sendMessage({
          senderId: chat.id,
          senderName: chat.name,
          content: chat.msg,
          channel: 'general',
          type: 'message',
        });
      }
    }, 6000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, dbReady, agents, tasks, claimTask, sendMessage, addStatusUpdate, updateAgentStatus, moveTask]);
}

// === Provider ===
export function MissionProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // === Initial data fetch ===
  useEffect(() => {
    async function init() {
      try {
        // Run setup first (creates tables if needed, seeds if empty)
        await fetch('/api/setup');

        // Fetch all data in parallel
        const [agentsData, tasksData, messagesData, statusData] = await Promise.all([
          api<Agent[]>('/api/agents'),
          api<KanbanTask[]>('/api/tasks'),
          api<ChatMessage[]>('/api/messages?channel=general&limit=100'),
          api<StatusUpdate[]>('/api/status?limit=50'),
        ]);

        setAgents(agentsData);
        setTasks(tasksData);
        setMessages(messagesData);
        setStatusUpdates(statusData);
        setDbConnected(true);
      } catch (err) {
        console.error('Failed to initialize from DB:', err);
        setDbConnected(false);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // === Polling (every 3 seconds) ===
  useEffect(() => {
    if (!dbConnected) return;

    pollRef.current = setInterval(async () => {
      try {
        const [agentsData, tasksData, messagesData, statusData] = await Promise.all([
          api<Agent[]>('/api/agents'),
          api<KanbanTask[]>('/api/tasks'),
          api<ChatMessage[]>('/api/messages?channel=general&limit=100'),
          api<StatusUpdate[]>('/api/status?limit=50'),
        ]);

        setAgents(agentsData);
        setTasks(tasksData);
        setMessages(messagesData);
        setStatusUpdates(statusData);
        setDbConnected(true);
      } catch {
        setDbConnected(false);
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [dbConnected]);

  // === Mutation Functions (all hit API + optimistic local update) ===

  const getAgent = useCallback(
    (id: string) => agents.find(a => a.id === id),
    [agents]
  );

  const updateAgentStatus = useCallback((agentId: string, status: AgentStatus) => {
    // Optimistic
    setAgents(prev =>
      prev.map(a => (a.id === agentId ? { ...a, status, lastActive: Date.now() } : a))
    );
    // Persist
    fetch(`/api/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(console.error);
  }, []);

  const addTask = useCallback((task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Persist and let polling pick it up
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    })
      .then(res => res.json())
      .then((saved: KanbanTask) => {
        setTasks(prev => [...prev, saved]);
      })
      .catch(console.error);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<KanbanTask>) => {
    // Optimistic
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t))
    );
    // Persist
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(console.error);
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    // Optimistic
    setTasks(prev => prev.filter(t => t.id !== taskId));
    // Persist
    fetch(`/api/tasks/${taskId}`, { method: 'DELETE' }).catch(console.error);
  }, []);

  const moveTask = useCallback((taskId: string, column: ColumnId) => {
    // Optimistic
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, column, updatedAt: Date.now() } : t))
    );
    // Persist
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column }),
    }).catch(console.error);
  }, []);

  const claimTask = useCallback((taskId: string, agentId: string) => {
    const now = Date.now();
    // Optimistic
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              claimedBy: agentId,
              claimedAt: now,
              assignee: agentId,
              lockedBy: agentId,
              column: t.column === 'backlog' || t.column === 'todo' ? 'in-progress' : t.column,
              updatedAt: now,
              worklog: [...(t.worklog || []), { agentId, action: 'claimed', timestamp: now }],
            }
          : t
      )
    );
    setAgents(prev =>
      prev.map(a =>
        a.id === agentId ? { ...a, currentTaskId: taskId, status: 'busy', lastActive: now } : a
      )
    );
    // Persist
    fetch(`/api/tasks/${taskId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    }).catch(console.error);
  }, []);

  const unclaimTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    // Optimistic
    if (task?.claimedBy) {
      setAgents(prev =>
        prev.map(a =>
          a.id === task.claimedBy ? { ...a, currentTaskId: null, status: 'online', lastActive: Date.now() } : a
        )
      );
    }
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, claimedBy: undefined, claimedAt: undefined, assignee: undefined, lockedBy: undefined, updatedAt: Date.now() }
          : t
      )
    );
    // Persist
    fetch(`/api/tasks/${taskId}/unclaim`, { method: 'POST' }).catch(console.error);
  }, [tasks]);

  const handoffTask = useCallback(
    (taskId: string, fromId: string, toId: string, note: string) => {
      const now = Date.now();
      // Optimistic
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? {
                ...t,
                handoffFrom: fromId,
                handoffTo: toId,
                handoffNote: note,
                isHandoff: true,
                assignee: toId,
                claimedBy: toId,
                lockedBy: toId,
                updatedAt: now,
                worklog: [
                  ...(t.worklog || []),
                  { agentId: fromId, action: `handoff to ${toId}`, timestamp: now, detail: note },
                ],
              }
            : t
        )
      );
      setAgents(prev =>
        prev.map(a => {
          if (a.id === fromId) return { ...a, currentTaskId: null, status: 'online', lastActive: now };
          if (a.id === toId) return { ...a, currentTaskId: taskId, status: 'busy', lastActive: now };
          return a;
        })
      );
      // Persist
      fetch(`/api/tasks/${taskId}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId, toId, note }),
      }).catch(console.error);
    },
    []
  );

  const sendMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const now = Date.now();
    const tempId = `m-${now}-${Math.random().toString(36).slice(2, 6)}`;
    // Optimistic
    const newMsg: ChatMessage = { ...msg, id: tempId, timestamp: now };
    setMessages(prev => [...prev, newMsg]);
    // Persist
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    }).catch(console.error);
  }, []);

  const addStatusUpdate = useCallback((update: Omit<StatusUpdate, 'id' | 'timestamp'>) => {
    const now = Date.now();
    const tempId = `u-${now}-${Math.random().toString(36).slice(2, 6)}`;
    // Optimistic
    const newUpdate: StatusUpdate = { ...update, id: tempId, timestamp: now };
    setStatusUpdates(prev => [...prev, newUpdate]);
    // Persist
    fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    }).catch(console.error);
  }, []);

  const toggleSimulation = useCallback(() => {
    setSimulationRunning(prev => !prev);
  }, []);

  // Run simulation (now DB-backed)
  useAgentSimulation(
    agents,
    tasks,
    claimTask,
    sendMessage,
    addStatusUpdate,
    updateAgentStatus,
    moveTask,
    simulationRunning,
    dbConnected
  );

  const store: MissionStore = {
    agents,
    getAgent,
    updateAgentStatus,
    tasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    claimTask,
    unclaimTask,
    handoffTask,
    messages,
    sendMessage,
    statusUpdates,
    addStatusUpdate,
    simulationRunning,
    toggleSimulation,
    loading,
    dbConnected,
  };

  return <MissionContext.Provider value={store}>{children}</MissionContext.Provider>;
}
