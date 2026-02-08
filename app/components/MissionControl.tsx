'use client';

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Cpu, 
  Activity, 
  Shield, 
  Wifi, 
  Server, 
  Zap, 
  Clock, 
  MessageSquare, 
  Play, 
  Pause, 
  LayoutGrid,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface Task {
  id: string;
  title: string;
  assignee?: string;
  status: 'pending' | 'active' | 'done';
}

// --- Mock Data ---
const INITIAL_AGENTS: Agent[] = [
  { id: '1', name: 'ORACLE', role: 'Orchestrator', status: 'working', cpu: 45, ram: 32, currentTask: 'Coordinating workflow sync' },
  { id: '2', name: 'TANK', role: 'Coding Unit', status: 'idle', cpu: 12, ram: 64 },
  { id: '3', name: 'MORPHEUS', role: 'Reviewer', status: 'thinking', cpu: 78, ram: 45, currentTask: 'Auditing PR #402' },
  { id: '4', name: 'SHURI', role: 'Docs/Research', status: 'offline', cpu: 0, ram: 0 },
];

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Audit NGINX Config', assignee: 'MORPHEUS', status: 'active' },
  { id: 't2', title: 'Scaffold MissionDeck UI', assignee: 'TANK', status: 'done' },
  { id: 't3', title: 'Optimize Docker Containers', assignee: 'ORACLE', status: 'pending' },
  { id: 't4', title: 'Update MEMORY.md', status: 'pending' },
];

export default function MissionControl() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [inputCmd, setInputCmd] = useState('');
  const [time, setTime] = useState(new Date());

  // Clock & Simulation Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      // Simulate resource fluctuation
      setAgents(prev => prev.map(a => ({
        ...a,
        cpu: a.status === 'offline' ? 0 : Math.max(5, Math.min(99, a.cpu + (Math.random() * 10 - 5))),
        ram: a.status === 'offline' ? 0 : Math.max(10, Math.min(90, a.ram + (Math.random() * 6 - 3))),
      })));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Add Log Helper
  const addLog = (source: string, message: string, type: Log['type'] = 'info') => {
    setLogs(prev => [{
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
      type
    }, ...prev.slice(0, 19)]); // Keep last 20
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;
    
    addLog('USER', `EXEC: ${inputCmd}`, 'info');
    
    // Mock response
    setTimeout(() => {
      addLog('SYSTEM', `Command '${inputCmd}' queued for execution.`, 'success');
    }, 600);
    
    setInputCmd('');
  };

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono relative overflow-hidden selection:bg-cyan-900 selection:text-cyan-100">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="scanline" />

      {/* --- HEADER --- */}
      <header className="border-b border-green-900/50 bg-black/80 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-cyan-400 animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-cyan-50 glow-text">MISSION DECK</h1>
            <p className="text-xs text-green-600 tracking-[0.3em]">ARAFAT SERVER // REPAIR SHOP</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-400" />
            <span>ONLINE</span>
          </div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" />
            <span>HOST: 127.0.0.1</span>
          </div>
          <div className="flex items-center gap-2 border border-green-900 px-3 py-1 rounded bg-green-950/20">
            <Clock className="w-4 h-4" />
            <span>{time.toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* --- MAIN GRID --- */}
      <main className="p-6 grid grid-cols-12 gap-6 relative z-0 max-w-[1920px] mx-auto h-[calc(100vh-80px)]">
        
        {/* LEFT COL: AGENT MATRIX (3/12) */}
        <section className="col-span-3 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2 border-b border-cyan-900/30 pb-2">
            <LayoutGrid className="w-5 h-5" /> AGENT MATRIX
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {agents.map(agent => (
              <motion.div 
                key={agent.id}
                layoutId={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-white/5 ${
                  selectedAgent === agent.id 
                    ? 'border-cyan-500 bg-cyan-950/20 border-glow' 
                    : 'border-green-900/50 bg-black/40'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{agent.name}</h3>
                    <span className="text-xs text-gray-400 uppercase">{agent.role}</span>
                  </div>
                  <div className={`px-2 py-0.5 text-[10px] rounded border ${
                    agent.status === 'working' ? 'border-green-500 text-green-400 bg-green-900/20' :
                    agent.status === 'thinking' ? 'border-purple-500 text-purple-400 bg-purple-900/20 animate-pulse' :
                    agent.status === 'offline' ? 'border-red-900 text-red-700' :
                    'border-gray-600 text-gray-500'
                  }`}>
                    {agent.status}
                  </div>
                </div>

                {agent.status !== 'offline' && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Cpu className="w-3 h-3" />
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 transition-all duration-500" 
                          style={{ width: `${agent.cpu}%` }}
                        />
                      </div>
                      <span className="w-8 text-right">{agent.cpu.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Activity className="w-3 h-3" />
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 transition-all duration-500" 
                          style={{ width: `${agent.ram}%` }} 
                        />
                      </div>
                      <span className="w-8 text-right">{agent.ram}%</span>
                    </div>
                  </div>
                )}
                
                {agent.currentTask && (
                  <div className="mt-3 text-xs text-cyan-200/80 bg-cyan-900/10 p-2 rounded border border-cyan-900/30 truncate">
                    Running: {agent.currentTask}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* MID COL: TACTICAL OPS (5/12) */}
        <section className="col-span-5 flex flex-col gap-4 border-x border-green-900/20 px-6">
          <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2 border-b border-cyan-900/30 pb-2">
            <CheckCircle2 className="w-5 h-5" /> TACTICAL OPS
          </h2>

          <div className="flex-1 overflow-y-auto space-y-4">
             {/* Simple Kanban Columns Style */}
             <div className="space-y-2">
                <h3 className="text-xs text-gray-500 uppercase tracking-wider">Active Tasks</h3>
                {tasks.filter(t => t.status === 'active').map(task => (
                  <div key={task.id} className="p-3 bg-green-950/10 border border-green-500/50 rounded flex justify-between items-center group hover:border-green-400 transition-colors">
                    <span className="text-sm font-medium">{task.title}</span>
                    <span className="text-xs bg-black/50 px-2 py-1 rounded text-cyan-300 border border-cyan-900">
                      {task.assignee}
                    </span>
                  </div>
                ))}
             </div>

             <div className="space-y-2 pt-4">
                <h3 className="text-xs text-gray-500 uppercase tracking-wider">Pending</h3>
                {tasks.filter(t => t.status === 'pending').map(task => (
                  <div key={task.id} className="p-3 bg-gray-900/30 border border-gray-800 rounded flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                     <span className="text-sm">{task.title}</span>
                     <button className="text-[10px] border border-gray-600 px-2 py-1 rounded hover:bg-gray-800">ASSIGN</button>
                  </div>
                ))}
             </div>

             <div className="space-y-2 pt-4">
                <h3 className="text-xs text-gray-500 uppercase tracking-wider">Completed</h3>
                {tasks.filter(t => t.status === 'done').map(task => (
                  <div key={task.id} className="p-3 bg-gray-900/10 border border-gray-800/50 rounded flex justify-between items-center opacity-50 grayscale">
                     <span className="text-sm line-through">{task.title}</span>
                     <CheckCircle2 className="w-4 h-4" />
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* RIGHT COL: NEURAL LINK (4/12) */}
        <section className="col-span-4 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2 border-b border-cyan-900/30 pb-2">
            <Terminal className="w-5 h-5" /> NEURAL LINK
          </h2>

          {/* Terminal Output */}
          <div className="flex-1 bg-black border border-green-900/50 rounded-lg p-4 font-mono text-xs overflow-y-auto font-medium shadow-inner shadow-green-900/20">
            <div className="space-y-1">
              <div className="text-gray-500">System initialized...</div>
              <div className="text-gray-500">Connecting to OpenClaw Gateway... OK</div>
              <div className="text-gray-500">Loading Agent profiles... OK</div>
              <div className="my-2 border-b border-gray-800"></div>
              {logs.map(log => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-gray-600">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-500' : 
                      log.type === 'warn' ? 'text-yellow-500' : 
                      log.type === 'success' ? 'text-green-400' : 'text-cyan-300'}
                  `}>
                    {log.source}:
                  </span>
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))}
              <div className="animate-pulse text-green-500">_</div>
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleCommand} className="relative">
            <div className="absolute left-3 top-3 text-green-500">
              <Zap className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              value={inputCmd}
              onChange={(e) => setInputCmd(e.target.value)}
              placeholder="Enter command or broadcast message..."
              className="w-full bg-gray-900/50 border border-green-900/50 rounded p-2.5 pl-10 text-sm text-green-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-gray-700"
            />
          </form>
        </section>

      </main>
    </div>
  );
}
