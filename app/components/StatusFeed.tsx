'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Grab,
  TrendingUp,
  CheckCircle2,
  ArrowRightLeft,
  AlertOctagon,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useMissionStore } from '../lib/store';
import type { StatusUpdate } from '../lib/types';

const UPDATE_ICONS: Record<StatusUpdate['type'], React.ReactNode> = {
  claim: <Grab className="w-3.5 h-3.5 text-cyan-400" />,
  progress: <TrendingUp className="w-3.5 h-3.5 text-blue-400" />,
  complete: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  handoff: <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />,
  blocked: <AlertOctagon className="w-3.5 h-3.5 text-red-400" />,
  online: <Wifi className="w-3.5 h-3.5 text-green-400" />,
  offline: <WifiOff className="w-3.5 h-3.5 text-red-400" />,
};

const UPDATE_COLORS: Record<StatusUpdate['type'], string> = {
  claim: 'border-l-cyan-500',
  progress: 'border-l-blue-500',
  complete: 'border-l-green-500',
  handoff: 'border-l-purple-500',
  blocked: 'border-l-red-500',
  online: 'border-l-green-500',
  offline: 'border-l-red-500',
};

const AGENT_COLORS: Record<string, string> = {
  axis: 'text-cyan-400',
  nova: 'text-pink-400',
  cipher: 'text-amber-400',
  forge: 'text-blue-400',
  sentinel: 'text-green-400',
};

export default function StatusFeed() {
  const { statusUpdates, agents } = useMissionStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const sorted = [...statusUpdates].sort((a, b) => b.timestamp - a.timestamp);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [statusUpdates.length]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = useCallback((ts: number) => {
    const diff = currentTime - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  }, [currentTime]);

  const getAgentAvatar = (agentId: string) => {
    return agents.find(a => a.id === agentId)?.avatar || '🤖';
  };

  return (
    <div className="flex flex-col h-full bg-black/30 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-black/50 shrink-0">
        <Activity className="w-4 h-4 text-green-400" />
        <span className="text-xs font-bold text-green-400 tracking-wider">LIVE STATUS</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] text-green-600">REAL-TIME</span>
        </div>
      </div>

      {/* Agent Summary */}
      <div className="grid grid-cols-5 gap-1 px-3 py-2 border-b border-gray-800/50 bg-gray-950/30 shrink-0">
        {agents.map(agent => (
          <div key={agent.id} className="flex flex-col items-center text-center">
            <span className="text-sm">{agent.avatar}</span>
            <span className={`text-[8px] font-bold ${AGENT_COLORS[agent.id] || 'text-gray-400'}`}>
              {agent.name}
            </span>
            <span
              className={`text-[7px] px-1 rounded mt-0.5 ${
                agent.status === 'online'
                  ? 'bg-green-900/30 text-green-400'
                  : agent.status === 'busy'
                  ? 'bg-yellow-900/30 text-yellow-400'
                  : agent.status === 'idle'
                  ? 'bg-gray-800 text-gray-500'
                  : 'bg-red-900/30 text-red-400'
              }`}
            >
              {agent.status.toUpperCase()}
            </span>
            {agent.currentTaskId && (
              <span className="text-[7px] text-gray-600 mt-0.5 truncate max-w-full">working</span>
            )}
          </div>
        ))}
      </div>

      {/* Updates Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 kanban-column-scroll">
        <AnimatePresence initial={false}>
          {sorted.map(update => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-2 p-2 bg-black/40 rounded border border-gray-800/50 border-l-2 ${
                UPDATE_COLORS[update.type]
              }`}
            >
              <div className="shrink-0 mt-0.5">{UPDATE_ICONS[update.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">{getAgentAvatar(update.agentId)}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      AGENT_COLORS[update.agentId] || 'text-gray-400'
                    }`}
                  >
                    {update.agentName}
                  </span>
                  <span className="text-[8px] text-gray-600">{formatTime(update.timestamp)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{update.message}</p>
                {update.taskTitle && (
                  <span className="text-[8px] text-gray-600 inline-flex items-center gap-1 mt-0.5">
                    📋 {update.taskTitle}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
