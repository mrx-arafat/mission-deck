'use client';

import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Cpu,
  Activity,
  Wifi,
  Server,
  Clock,
  LayoutGrid,
  Bot,
  ChevronRight,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import KanbanBoard from './KanbanBoard';

// --- Types ---
interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'thinking' | 'offline';
  cpu: number;
  ram: number;
  currentTask?: string;
}

interface Log {
  id: number;
  timestamp: string;
  source: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

// --- Mock Data ---
const INITIAL_AGENTS: Agent[] = [
  { id: '1', name: 'AXIS', role: 'Mission Lead', status: 'working', cpu: 62, ram: 48, currentTask: 'Orchestrating Kanban workflow' },
  { id: '2', name: 'ORACLE', role: 'Orchestrator', status: 'working', cpu: 45, ram: 32, currentTask: 'Coordinating workflow sync' },
  { id: '3', name: 'TANK', role: 'Coding Unit', status: 'idle', cpu: 12, ram: 64 },
  { id: '4', name: 'MORPHEUS', role: 'Reviewer', status: 'thinking', cpu: 78, ram: 45, currentTask: 'Auditing PR #402' },
  { id: '5', name: 'SHURI', role: 'Docs/Research', status: 'offline', cpu: 0, ram: 0 },
];

export default function MissionControl() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>('1');
  const [inputCmd, setInputCmd] = useState('');
  const [time, setTime] = useState(new Date());
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Clock & Simulation Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setAgents(prev => prev.map(a => ({
        ...a,
        cpu: a.status === 'offline' ? 0 : Math.max(5, Math.min(99, a.cpu + (Math.random() * 10 - 5))),
        ram: a.status === 'offline' ? 0 : Math.max(10, Math.min(90, a.ram + (Math.random() * 6 - 3))),
      })));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Periodic log simulation
  useEffect(() => {
    const messages = [
      { source: 'AXIS', message: 'Task queue optimized. 3 items reprioritized.', type: 'success' as const },
      { source: 'ORACLE', message: 'Workflow sync complete. All agents aligned.', type: 'info' as const },
      { source: 'MORPHEUS', message: 'PR #402 review in progress. 2 issues flagged.', type: 'warn' as const },
      { source: 'SYSTEM', message: 'Memory usage nominal. All services healthy.', type: 'info' as const },
      { source: 'AXIS', message: 'New task deployed to QUEUED column.', type: 'success' as const },
      { source: 'TANK', message: 'Build pipeline idle. Awaiting assignment.', type: 'info' as const },
    ];

    const logTimer = setInterval(() => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        ...msg,
      }, ...prev.slice(0, 29)]);
    }, 4000);

    return () => clearInterval(logTimer);
  }, []);

  const addLog = (source: string, message: string, type: Log['type'] = 'info') => {
    setLogs(prev => [{
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
      type
    }, ...prev.slice(0, 29)]);
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;
    addLog('USER', `EXEC: ${inputCmd}`, 'info');
    setTimeout(() => {
      addLog('AXIS', `Command '${inputCmd}' processed and queued.`, 'success');
    }, 600);
    setInputCmd('');
  };

  return (
    <div className="min-h-screen h-screen bg-black text-green-500 font-mono relative overflow-hidden selection:bg-cyan-900 selection:text-cyan-100 flex flex-col">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="scanline" />

      {/* --- HEADER --- */}
      <header className="border-b border-green-900/50 bg-black/80 backdrop-blur-md px-5 py-3 flex justify-between items-center sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="w-8 h-8 text-cyan-400" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-[0.3em] text-cyan-50 glow-text">AXIS MISSION CONTROL</h1>
            <p className="text-[10px] text-green-600 tracking-[0.4em]">KANBAN OPS DASHBOARD // v2.0</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400">ONLINE</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Server className="w-3.5 h-3.5 text-purple-400" />
            <span>HOST: AXIS-01</span>
          </div>
          <div className="flex items-center gap-2 border border-green-900/50 px-3 py-1 rounded bg-green-950/20">
            <Clock className="w-3.5 h-3.5" />
            <span>{time.toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex overflow-hidden relative z-0">

        {/* LEFT PANEL: AGENT MATRIX */}
        <aside className={`shrink-0 border-r border-green-900/30 bg-black/30 transition-all duration-300 flex flex-col ${
          leftPanelCollapsed ? 'w-12' : 'w-64'
        }`}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-green-900/30">
            {!leftPanelCollapsed && (
              <h2 className="text-xs font-bold text-cyan-400 flex items-center gap-2 tracking-wider">
                <LayoutGrid className="w-4 h-4" /> AGENTS
              </h2>
            )}
            <button
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="text-gray-600 hover:text-cyan-400 transition-colors ml-auto"
            >
              {leftPanelCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {agents.map(agent => (
              <motion.div
                key={agent.id}
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                className={`rounded-md cursor-pointer transition-all ${
                  leftPanelCollapsed ? 'p-2' : 'p-3'
                } ${
                  selectedAgent === agent.id
                    ? 'border border-cyan-800 bg-cyan-950/20 border-glow'
                    : 'border border-transparent hover:border-gray-800 hover:bg-white/[0.02]'
                }`}
              >
                {leftPanelCollapsed ? (
                  /* Collapsed: just a status dot with initial */
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      agent.status === 'working' ? 'bg-green-500 animate-pulse' :
                      agent.status === 'thinking' ? 'bg-purple-500 animate-pulse' :
                      agent.status === 'offline' ? 'bg-red-800' :
                      'bg-gray-600'
                    }`} />
                    <span className="text-[9px] text-gray-500">{agent.name[0]}</span>
                  </div>
                ) : (
                  /* Expanded */
                  <>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-bold text-sm text-gray-200">{agent.name}</h3>
                        <span className="text-[10px] text-gray-500 uppercase">{agent.role}</span>
                      </div>
                      <div className={`px-1.5 py-0.5 text-[9px] rounded border ${
                        agent.status === 'working' ? 'border-green-700 text-green-400 bg-green-900/20' :
                        agent.status === 'thinking' ? 'border-purple-700 text-purple-400 bg-purple-900/20 animate-pulse' :
                        agent.status === 'offline' ? 'border-red-900 text-red-700' :
                        'border-gray-700 text-gray-500'
                      }`}>
                        {agent.status}
                      </div>
                    </div>

                    {agent.status !== 'offline' && (
                      <div className="space-y-1.5 mt-2">
                        <div className="flex items-center gap-2 text-[10px]">
                          <Cpu className="w-3 h-3 text-gray-600" />
                          <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-600 transition-all duration-500"
                              style={{ width: `${agent.cpu}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-gray-500">{agent.cpu.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <Activity className="w-3 h-3 text-gray-600" />
                          <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 transition-all duration-500"
                              style={{ width: `${agent.ram}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-gray-500">{agent.ram.toFixed(0)}%</span>
                        </div>
                      </div>
                    )}

                    {agent.currentTask && (
                      <div className="mt-2 text-[10px] text-cyan-300/60 bg-cyan-900/10 p-1.5 rounded border border-cyan-900/20 truncate">
                        {agent.currentTask}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </aside>

        {/* CENTER: KANBAN BOARD */}
        <section className="flex-1 flex flex-col overflow-hidden p-4">
          <KanbanBoard />
        </section>

        {/* RIGHT PANEL: NEURAL LINK */}
        <aside className={`shrink-0 border-l border-green-900/30 bg-black/30 transition-all duration-300 flex flex-col ${
          rightPanelCollapsed ? 'w-12' : 'w-80'
        }`}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-green-900/30">
            {!rightPanelCollapsed && (
              <h2 className="text-xs font-bold text-cyan-400 flex items-center gap-2 tracking-wider">
                <Terminal className="w-4 h-4" /> NEURAL LINK
              </h2>
            )}
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="text-gray-600 hover:text-cyan-400 transition-colors ml-auto"
            >
              {rightPanelCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!rightPanelCollapsed && (
            <>
              {/* Terminal Output */}
              <div className="flex-1 overflow-y-auto p-3 text-[11px] font-medium">
                <div className="space-y-1">
                  <div className="text-gray-600">AXIS Neural Link initialized...</div>
                  <div className="text-gray-600">Connecting to agent mesh... OK</div>
                  <div className="text-gray-600">Kanban sync active... OK</div>
                  <div className="my-2 border-b border-gray-800/50" />
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-1.5 leading-relaxed">
                      <span className="text-gray-700 shrink-0">[{log.timestamp}]</span>
                      <span className={`shrink-0 ${
                        log.type === 'error' ? 'text-red-500' :
                        log.type === 'warn' ? 'text-yellow-500' :
                        log.type === 'success' ? 'text-green-400' : 'text-cyan-400'
                      }`}>
                        {log.source}:
                      </span>
                      <span className="text-gray-400">{log.message}</span>
                    </div>
                  ))}
                  <div className="animate-pulse text-green-500">_</div>
                </div>
              </div>

              {/* Command Input */}
              <form onSubmit={handleCommand} className="p-3 border-t border-green-900/30">
                <div className="relative">
                  <div className="absolute left-2.5 top-2 text-green-600">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={inputCmd}
                    onChange={(e) => setInputCmd(e.target.value)}
                    placeholder="axis> command..."
                    className="w-full bg-black/50 border border-green-900/40 rounded px-2.5 pl-8 py-1.5 text-xs text-green-100 focus:outline-none focus:border-cyan-700 focus:ring-1 focus:ring-cyan-900/50 transition-all placeholder:text-gray-700"
                  />
                </div>
              </form>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
