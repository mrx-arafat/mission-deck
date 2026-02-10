'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  Palette,
  Server,
  Wrench,
  Users,
} from 'lucide-react';
import { useMissionStore } from '../lib/store';
import type { AgentRole } from '../lib/types';

const ROLE_ICONS: Record<AgentRole, React.ReactNode> = {
  general: <Bot className="w-3.5 h-3.5" />,
  frontend: <Palette className="w-3.5 h-3.5" />,
  backend: <Server className="w-3.5 h-3.5" />,
  security: <Shield className="w-3.5 h-3.5" />,
  devops: <Wrench className="w-3.5 h-3.5" />,
  qa: <Zap className="w-3.5 h-3.5" />,
};

const AGENT_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  axis: { text: 'text-cyan-400', border: 'border-cyan-800', bg: 'bg-cyan-950/20' },
  nova: { text: 'text-pink-400', border: 'border-pink-800', bg: 'bg-pink-950/20' },
  cipher: { text: 'text-amber-400', border: 'border-amber-800', bg: 'bg-amber-950/20' },
  forge: { text: 'text-blue-400', border: 'border-blue-800', bg: 'bg-blue-950/20' },
  sentinel: { text: 'text-green-400', border: 'border-green-800', bg: 'bg-green-950/20' },
};

export default function AgentPanel() {
  const { agents, tasks } = useMissionStore();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const onlineCount = agents.filter(a => a.status !== 'offline').length;
  const busyCount = agents.filter(a => a.status === 'busy').length;

  return (
    <div className="flex flex-col h-full bg-black/30 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-black/50 shrink-0">
        <Users className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold text-purple-400 tracking-wider">AGENTS</span>
        <div className="ml-auto flex items-center gap-2 text-[9px]">
          <span className="text-green-400">{onlineCount} online</span>
          <span className="text-yellow-400">{busyCount} busy</span>
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 kanban-column-scroll">
        {agents.map(agent => {
          const colors = AGENT_COLORS[agent.id] || { text: 'text-gray-400', border: 'border-gray-700', bg: 'bg-gray-900/20' };
          const isExpanded = expandedAgent === agent.id;
          const currentTask = agent.currentTaskId ? tasks.find(t => t.id === agent.currentTaskId) : null;

          return (
            <div key={agent.id}>
              <button
                onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                className={`w-full flex items-center gap-2 p-2 rounded border transition-all ${colors.border} ${colors.bg} hover:brightness-125`}
              >
                <span className="text-lg">{agent.avatar}</span>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold ${colors.text}`}>{agent.name}</span>
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
                    <span className="text-[8px] text-gray-600 uppercase">{agent.status}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {ROLE_ICONS[agent.role]}
                    <span className="text-[9px] text-gray-500 uppercase">{agent.role}</span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-600" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2.5 ml-3 border-l border-gray-800 space-y-2">
                      {/* Skills */}
                      <div>
                        <span className="text-[8px] text-gray-600 uppercase tracking-wider">Skills</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agent.skills.map(skill => (
                            <span
                              key={skill}
                              className="text-[8px] px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-400 border border-gray-700/50"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Current Task */}
                      {currentTask && (
                        <div>
                          <span className="text-[8px] text-gray-600 uppercase tracking-wider">Current Task</span>
                          <div className="mt-1 p-1.5 bg-black/40 border border-gray-800 rounded text-[10px] text-gray-300">
                            {currentTask.title}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-[9px] text-gray-500">
                        <span>✓ {agent.completedTasks} done</span>
                        <span>
                          Last active:{' '}
                          {new Date(agent.lastActive).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
