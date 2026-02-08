'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Bot,
} from 'lucide-react';
import KanbanBoard from './KanbanBoard';

export default function MissionControl() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
            <h1 className="text-xl font-bold tracking-[0.3em] text-cyan-50 glow-text">AXIS</h1>
            <p className="text-[10px] text-green-600 tracking-[0.4em]">MISSION CONTROL</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400">AXIS ONLINE</span>
          </div>
          <div className="flex items-center gap-2 border border-green-900/50 px-3 py-1 rounded bg-green-950/20">
            <Clock className="w-3.5 h-3.5" />
            <span>{time.toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* --- KANBAN BOARD --- */}
      <main className="flex-1 flex flex-col overflow-hidden p-4 relative z-0">
        <KanbanBoard />
      </main>
    </div>
  );
}
