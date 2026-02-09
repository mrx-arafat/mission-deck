'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Bot,
  MessageSquare,
  Activity,
  Users,
  LayoutDashboard,
  Play,
  Pause,
  LogOut,
  Database,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useMissionStore } from '../lib/store';
import KanbanBoard from './KanbanBoard';
import TeamChat from './TeamChat';
import StatusFeed from './StatusFeed';
import AgentPanel from './AgentPanel';

type SidePanel = 'chat' | 'status' | 'agents';

export default function MissionControl() {
  const [time, setTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState<SidePanel>('chat');
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const { agents, simulationRunning, toggleSimulation, messages, statusUpdates, loading, dbConnected } = useMissionStore();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const onlineAgents = agents.filter(a => a.status !== 'offline').length;
  const busyAgents = agents.filter(a => a.status === 'busy').length;

  const panelTabs: { id: SidePanel; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'chat',
      label: 'CHAT',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      badge: messages.length,
    },
    {
      id: 'status',
      label: 'STATUS',
      icon: <Activity className="w-3.5 h-3.5" />,
      badge: statusUpdates.length,
    },
    {
      id: 'agents',
      label: 'AGENTS',
      icon: <Users className="w-3.5 h-3.5" />,
      badge: onlineAgents,
    },
  ];

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen h-screen bg-black text-green-500 font-mono flex flex-col items-center justify-center relative overflow-hidden selection:bg-cyan-900 selection:text-cyan-100">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="scanline" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <Bot className="w-16 h-16 text-cyan-400 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-ping" />
          </div>
          <h1 className="text-2xl font-bold tracking-[0.3em] text-cyan-50 glow-text">MISSION DECK</h1>
          <div className="flex items-center gap-3 text-sm text-green-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="tracking-wider">CONNECTING TO DATABASE...</span>
          </div>
          <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-cyan-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-[10px] text-gray-600 tracking-[0.3em]">INITIALIZING MULTI-AGENT SYSTEMS</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-bold tracking-[0.3em] text-cyan-50 glow-text">MISSION DECK</h1>
            <p className="text-[10px] text-green-600 tracking-[0.4em]">MULTI-AGENT COMMAND CENTER</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Agent Status Summary */}
          <div className="hidden md:flex items-center gap-3">
            {agents.slice(0, 5).map(agent => (
              <div key={agent.id} className="flex items-center gap-1" title={`${agent.name}: ${agent.status}`}>
                <span className="text-sm">{agent.avatar}</span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    agent.status === 'online'
                      ? 'bg-green-500 animate-pulse'
                      : agent.status === 'busy'
                      ? 'bg-yellow-500'
                      : agent.status === 'idle'
                      ? 'bg-gray-500'
                      : 'bg-red-500'
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-green-400">{onlineAgents} ONLINE</span>
            <span className="text-yellow-400">{busyAgents} BUSY</span>
          </div>

          {/* DB Connection Status */}
          <div
            className={`flex items-center gap-1.5 text-[10px] border rounded px-2 py-1 ${
              dbConnected
                ? 'border-green-900/50 text-green-500 bg-green-950/20'
                : 'border-red-900/50 text-red-400 bg-red-950/20 animate-pulse'
            }`}
            title={dbConnected ? 'Database connected and syncing' : 'Database disconnected'}
          >
            {dbConnected ? (
              <>
                <Database className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <span>DB SYNCED</span>
              </>
            ) : (
              <>
                <Database className="w-3 h-3" />
                <WifiOff className="w-3 h-3" />
                <span>OFFLINE</span>
              </>
            )}
          </div>

          {/* Simulation Toggle */}
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 text-[10px] border rounded px-2 py-1 transition-all ${
              simulationRunning
                ? 'border-green-800 text-green-400 bg-green-950/20'
                : 'border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
            title={simulationRunning ? 'Pause agent simulation' : 'Resume agent simulation'}
          >
            {simulationRunning ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {simulationRunning ? 'LIVE' : 'PAUSED'}
          </button>

          {/* Side Panel Toggle */}
          <button
            onClick={() => setSidePanelOpen(!sidePanelOpen)}
            className={`flex items-center gap-1.5 text-[10px] border rounded px-2 py-1 transition-all ${
              sidePanelOpen
                ? 'border-cyan-800 text-cyan-400 bg-cyan-950/20'
                : 'border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            <LayoutDashboard className="w-3 h-3" />
            PANEL
          </button>

          <div className="flex items-center gap-2 border border-green-900/50 px-3 py-1 rounded bg-green-950/20">
            <Clock className="w-3.5 h-3.5" />
            <span>{time.toLocaleTimeString()}</span>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            className="flex items-center gap-1.5 border border-red-900/50 px-3 py-1 rounded bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:border-red-700 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>EXIT</span>
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex overflow-hidden relative z-0">
        {/* Kanban Board Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <KanbanBoard />
        </div>

        {/* Side Panel */}
        {sidePanelOpen && (
          <div className="w-80 shrink-0 border-l border-gray-800 flex flex-col bg-black/30">
            {/* Panel Tabs */}
            <div className="flex border-b border-gray-800 shrink-0">
              {panelTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold tracking-wider transition-all ${
                    activePanel === tab.id
                      ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/10'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden p-2">
              {activePanel === 'chat' && <TeamChat />}
              {activePanel === 'status' && <StatusFeed />}
              {activePanel === 'agents' && <AgentPanel />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
