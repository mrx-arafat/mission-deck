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

// === Initial Agents ===
const INITIAL_AGENTS: Agent[] = [
  {
    id: 'axis',
    name: 'AXIS',
    role: 'general',
    status: 'online',
    avatar: '🤖',
    currentTaskId: null,
    skills: ['coordination', 'planning', 'monitoring'],
    completedTasks: 12,
    lastActive: Date.now(),
  },
  {
    id: 'nova',
    name: 'NOVA',
    role: 'frontend',
    status: 'online',
    avatar: '🎨',
    currentTaskId: null,
    skills: ['react', 'css', 'ui-design', 'accessibility'],
    completedTasks: 8,
    lastActive: Date.now(),
  },
  {
    id: 'cipher',
    name: 'CIPHER',
    role: 'security',
    status: 'busy',
    avatar: '🔒',
    currentTaskId: null,
    skills: ['pen-testing', 'audit', 'encryption', 'auth'],
    completedTasks: 15,
    lastActive: Date.now(),
  },
  {
    id: 'forge',
    name: 'FORGE',
    role: 'backend',
    status: 'idle',
    avatar: '⚡',
    currentTaskId: null,
    skills: ['api', 'database', 'microservices', 'websockets'],
    completedTasks: 10,
    lastActive: Date.now(),
  },
  {
    id: 'sentinel',
    name: 'SENTINEL',
    role: 'devops',
    status: 'online',
    avatar: '🛡️',
    currentTaskId: null,
    skills: ['docker', 'ci-cd', 'kubernetes', 'monitoring'],
    completedTasks: 7,
    lastActive: Date.now(),
  },
];

// === Initial Tasks ===
const INITIAL_TASKS: KanbanTask[] = [
  {
    id: 't1',
    title: 'Audit NGINX Config',
    description: 'Full security review of NGINX reverse proxy configuration',
    assignee: 'cipher',
    priority: 'high',
    column: 'in-progress',
    tags: ['security', 'infra'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    claimedBy: 'cipher',
    claimedAt: Date.now() - 3600000,
    lockedBy: 'cipher',
    worklog: [
      { agentId: 'cipher', action: 'claimed', timestamp: Date.now() - 3600000 },
      { agentId: 'cipher', action: 'started audit', timestamp: Date.now() - 3000000, detail: 'Scanning headers and SSL config' },
    ],
  },
  {
    id: 't2',
    title: 'Scaffold MissionDeck UI',
    description: 'Build the initial dashboard layout and components',
    assignee: 'nova',
    priority: 'medium',
    column: 'done',
    tags: ['frontend'],
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 86400000,
    claimedBy: 'nova',
    worklog: [
      { agentId: 'nova', action: 'completed', timestamp: Date.now() - 86400000 },
    ],
  },
  {
    id: 't3',
    title: 'Optimize Docker Containers',
    description: 'Reduce image sizes and optimize build layers',
    priority: 'critical',
    column: 'todo',
    tags: ['devops', 'infra'],
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 43200000,
  },
  {
    id: 't4',
    title: 'Update MEMORY.md',
    description: 'Document all recent architecture decisions',
    priority: 'low',
    column: 'backlog',
    tags: ['docs'],
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 259200000,
  },
  {
    id: 't5',
    title: 'API Rate Limiter',
    description: 'Implement rate limiting middleware for all endpoints',
    assignee: 'forge',
    priority: 'high',
    column: 'review',
    tags: ['backend', 'security'],
    createdAt: Date.now() - 36000000,
    updatedAt: Date.now() - 3600000,
    claimedBy: 'forge',
    handoffFrom: 'forge',
    handoffTo: 'cipher',
    handoffNote: 'Ready for security review',
    isHandoff: true,
    worklog: [
      { agentId: 'forge', action: 'claimed', timestamp: Date.now() - 36000000 },
      { agentId: 'forge', action: 'implemented', timestamp: Date.now() - 7200000, detail: 'Token bucket algorithm with Redis backing' },
      { agentId: 'forge', action: 'handoff to CIPHER', timestamp: Date.now() - 3600000, detail: 'Ready for security review' },
    ],
  },
  {
    id: 't6',
    title: 'CI/CD Pipeline Refactor',
    description: 'Migrate from Jenkins to GitHub Actions',
    assignee: 'sentinel',
    priority: 'medium',
    column: 'in-progress',
    tags: ['devops'],
    createdAt: Date.now() - 50000000,
    updatedAt: Date.now(),
    claimedBy: 'sentinel',
    lockedBy: 'sentinel',
    worklog: [
      { agentId: 'sentinel', action: 'claimed', timestamp: Date.now() - 50000000 },
      { agentId: 'sentinel', action: 'in progress', timestamp: Date.now() - 10000000, detail: 'Writing workflow YAML configs' },
    ],
  },
  {
    id: 't7',
    title: 'WebSocket Gateway',
    description: 'Real-time event streaming for agent communication',
    priority: 'critical',
    column: 'todo',
    tags: ['backend', 'infra'],
    createdAt: Date.now() - 10000000,
    updatedAt: Date.now() - 10000000,
  },
  {
    id: 't8',
    title: 'Dark Mode Persistence',
    description: 'Save theme preference to localStorage',
    assignee: 'nova',
    priority: 'low',
    column: 'done',
    tags: ['frontend'],
    createdAt: Date.now() - 300000000,
    updatedAt: Date.now() - 200000000,
    claimedBy: 'nova',
    worklog: [
      { agentId: 'nova', action: 'completed', timestamp: Date.now() - 200000000 },
    ],
  },
];

// === Initial Chat Messages ===
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    senderId: 'axis',
    senderName: 'AXIS',
    content: 'Good morning team. Sprint 4 is active. Priority targets: Docker optimization and WebSocket gateway.',
    timestamp: Date.now() - 7200000,
    channel: 'general',
    type: 'message',
  },
  {
    id: 'm2',
    senderId: 'cipher',
    senderName: 'CIPHER',
    content: 'Starting NGINX audit now. Found 3 potential header misconfigurations already.',
    timestamp: Date.now() - 3600000,
    channel: 'general',
    type: 'message',
    taskRef: 't1',
  },
  {
    id: 'm3',
    senderId: 'forge',
    senderName: 'FORGE',
    content: 'Rate limiter is ready for review. @CIPHER can you take a look at the security aspects?',
    timestamp: Date.now() - 1800000,
    channel: 'general',
    type: 'handoff',
    taskRef: 't5',
    mentions: ['cipher'],
  },
  {
    id: 'm4',
    senderId: 'cipher',
    senderName: 'CIPHER',
    content: 'On it. Will review after the NGINX audit wraps up.',
    timestamp: Date.now() - 1700000,
    channel: 'general',
    type: 'message',
  },
  {
    id: 'm5',
    senderId: 'sentinel',
    senderName: 'SENTINEL',
    content: 'CI/CD migration at 60%. GitHub Actions workflow for the main branch is live. Working on staging next.',
    timestamp: Date.now() - 900000,
    channel: 'general',
    type: 'message',
    taskRef: 't6',
  },
  {
    id: 'm6',
    senderId: 'nova',
    senderName: 'NOVA',
    content: 'Dashboard scaffold is complete! Ready to help with any frontend tasks.',
    timestamp: Date.now() - 600000,
    channel: 'general',
    type: 'status',
  },
  {
    id: 'm7',
    senderId: 'system',
    senderName: 'SYSTEM',
    content: 'FORGE handed off "API Rate Limiter" to CIPHER for security review.',
    timestamp: Date.now() - 1800000,
    channel: 'general',
    type: 'system',
    taskRef: 't5',
  },
];

// === Initial Status Updates ===
const INITIAL_UPDATES: StatusUpdate[] = [
  {
    id: 'u1',
    agentId: 'cipher',
    agentName: 'CIPHER',
    type: 'claim',
    message: 'Claimed "Audit NGINX Config"',
    timestamp: Date.now() - 3600000,
    taskId: 't1',
    taskTitle: 'Audit NGINX Config',
  },
  {
    id: 'u2',
    agentId: 'sentinel',
    agentName: 'SENTINEL',
    type: 'progress',
    message: 'CI/CD Pipeline at 60% — staging workflow next',
    timestamp: Date.now() - 900000,
    taskId: 't6',
    taskTitle: 'CI/CD Pipeline Refactor',
  },
  {
    id: 'u3',
    agentId: 'forge',
    agentName: 'FORGE',
    type: 'handoff',
    message: 'Handed off "API Rate Limiter" to CIPHER',
    timestamp: Date.now() - 1800000,
    taskId: 't5',
    taskTitle: 'API Rate Limiter',
  },
  {
    id: 'u4',
    agentId: 'nova',
    agentName: 'NOVA',
    type: 'complete',
    message: 'Completed "Scaffold MissionDeck UI"',
    timestamp: Date.now() - 86400000,
    taskId: 't2',
    taskTitle: 'Scaffold MissionDeck UI',
  },
  {
    id: 'u5',
    agentId: 'axis',
    agentName: 'AXIS',
    type: 'online',
    message: 'All agents online. Sprint 4 initiated.',
    timestamp: Date.now() - 7200000,
  },
];

// === Store Context ===
interface MissionStore {
  // Agents
  agents: Agent[];
  getAgent: (id: string) => Agent | undefined;
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;

  // Tasks
  tasks: KanbanTask[];
  addTask: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (taskId: string, updates: Partial<KanbanTask>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, column: ColumnId) => void;
  claimTask: (taskId: string, agentId: string) => void;
  unclaimTask: (taskId: string) => void;
  handoffTask: (taskId: string, fromId: string, toId: string, note: string) => void;

  // Chat
  messages: ChatMessage[];
  sendMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;

  // Status Updates
  statusUpdates: StatusUpdate[];
  addStatusUpdate: (update: Omit<StatusUpdate, 'id' | 'timestamp'>) => void;

  // Simulation
  simulationRunning: boolean;
  toggleSimulation: () => void;
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
  running: boolean
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionRef = useRef<number>(0);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastActionRef.current < 8000) return; // min 8s between actions
      lastActionRef.current = now;

      const action = Math.random();

      // 30% chance: idle agent claims an unclaimed task
      if (action < 0.3) {
        const idleAgents = agents.filter(a => a.status !== 'offline' && !a.currentTaskId);
        const unclaimedTasks = tasks.filter(t => !t.claimedBy && (t.column === 'todo' || t.column === 'backlog'));
        if (idleAgents.length > 0 && unclaimedTasks.length > 0) {
          const agent = idleAgents[Math.floor(Math.random() * idleAgents.length)];
          // Pick a task that matches agent skills
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
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, agents, tasks, claimTask, sendMessage, addStatusUpdate, updateAgentStatus, moveTask]);
}

// === Provider ===
export function MissionProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_TASKS);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>(INITIAL_UPDATES);
  const [simulationRunning, setSimulationRunning] = useState(true);

  const getAgent = useCallback(
    (id: string) => agents.find(a => a.id === id),
    [agents]
  );

  const updateAgentStatus = useCallback((agentId: string, status: AgentStatus) => {
    setAgents(prev =>
      prev.map(a => (a.id === agentId ? { ...a, status, lastActive: Date.now() } : a))
    );
  }, []);

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
      prev.map(t => (t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t))
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const moveTask = useCallback((taskId: string, column: ColumnId) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, column, updatedAt: Date.now() } : t))
    );
  }, []);

  const claimTask = useCallback((taskId: string, agentId: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              claimedBy: agentId,
              claimedAt: Date.now(),
              assignee: agentId,
              lockedBy: agentId,
              column: t.column === 'backlog' || t.column === 'todo' ? 'in-progress' : t.column,
              updatedAt: Date.now(),
              worklog: [
                ...(t.worklog || []),
                { agentId, action: 'claimed', timestamp: Date.now() },
              ],
            }
          : t
      )
    );
    setAgents(prev =>
      prev.map(a =>
        a.id === agentId ? { ...a, currentTaskId: taskId, status: 'busy', lastActive: Date.now() } : a
      )
    );
  }, []);

  const unclaimTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
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
  }, [tasks]);

  const handoffTask = useCallback(
    (taskId: string, fromId: string, toId: string, note: string) => {
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
                updatedAt: Date.now(),
                worklog: [
                  ...(t.worklog || []),
                  {
                    agentId: fromId,
                    action: `handoff to ${toId}`,
                    timestamp: Date.now(),
                    detail: note,
                  },
                ],
              }
            : t
        )
      );
      // Free the original agent
      setAgents(prev =>
        prev.map(a => {
          if (a.id === fromId) return { ...a, currentTaskId: null, status: 'online', lastActive: Date.now() };
          if (a.id === toId) return { ...a, currentTaskId: taskId, status: 'busy', lastActive: Date.now() };
          return a;
        })
      );
    },
    []
  );

  const sendMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `m${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMsg]);
  }, []);

  const addStatusUpdate = useCallback((update: Omit<StatusUpdate, 'id' | 'timestamp'>) => {
    const newUpdate: StatusUpdate = {
      ...update,
      id: `u${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    setStatusUpdates(prev => [...prev, newUpdate]);
  }, []);

  const toggleSimulation = useCallback(() => {
    setSimulationRunning(prev => !prev);
  }, []);

  // Run simulation
  useAgentSimulation(
    agents,
    tasks,
    claimTask,
    sendMessage,
    addStatusUpdate,
    updateAgentStatus,
    moveTask,
    simulationRunning
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
  };

  return <MissionContext.Provider value={store}>{children}</MissionContext.Provider>;
}
