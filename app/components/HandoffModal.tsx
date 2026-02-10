'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, X, User, Bot } from 'lucide-react';
import { useMissionStore } from '../lib/store';
import type { KanbanTask } from '../lib/types';

interface HandoffModalProps {
  task: KanbanTask;
  onClose: () => void;
}

export default function HandoffModal({ task, onClose }: HandoffModalProps) {
  const { agents, handoffTask, sendMessage, addStatusUpdate } = useMissionStore();
  const [targetId, setTargetId] = useState('');
  const [note, setNote] = useState('');
  const [direction, setDirection] = useState<'to-agent' | 'to-human'>('to-agent');

  const availableAgents = agents.filter(a => a.id !== task.claimedBy && a.status !== 'offline');
  const fromAgent = agents.find(a => a.id === task.claimedBy);
  const fromLabel = task.claimedBy ? (fromAgent?.name || task.claimedBy) : 'Unassigned';

  const handleHandoff = () => {
    const toId = direction === 'to-human' ? 'human' : targetId;
    if (!toId) return;

    const fromId = task.claimedBy || 'human';
    const toName = direction === 'to-human' ? 'Human Operator' : agents.find(a => a.id === toId)?.name || toId;

    handoffTask(task.id, fromId, toId, note || 'No notes');

    sendMessage({
      senderId: 'system',
      senderName: 'SYSTEM',
      content: `Handoff: "${task.title}" from ${fromLabel} → ${toName}. ${note ? `Note: ${note}` : ''}`,
      channel: 'general',
      type: 'handoff',
      taskRef: task.id,
    });

    addStatusUpdate({
      agentId: fromId,
      agentName: fromLabel,
      type: 'handoff',
      message: `Handed off "${task.title}" to ${toName}`,
      taskId: task.id,
      taskTitle: task.title,
    });

    onClose();
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
        className="bg-gray-950 border border-purple-900/50 rounded-lg p-5 w-full max-w-md shadow-2xl shadow-purple-900/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-purple-400 tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" /> HANDOFF
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Info */}
        <div className="p-2.5 bg-black/50 border border-gray-800 rounded mb-4">
          <span className="text-[10px] text-gray-500 uppercase">Task</span>
          <p className="text-xs text-gray-200 font-medium">{task.title}</p>
          <span className="text-[10px] text-gray-600">
            Currently: {fromLabel}
          </span>
        </div>

        {/* Direction */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setDirection('to-agent')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border text-xs transition-all ${
              direction === 'to-agent'
                ? 'border-purple-700 text-purple-400 bg-purple-950/20'
                : 'border-gray-800 text-gray-500 hover:border-gray-700'
            }`}
          >
            <Bot className="w-3.5 h-3.5" /> To Agent
          </button>
          <button
            onClick={() => setDirection('to-human')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border text-xs transition-all ${
              direction === 'to-human'
                ? 'border-violet-700 text-violet-400 bg-violet-950/20'
                : 'border-gray-800 text-gray-500 hover:border-gray-700'
            }`}
          >
            <User className="w-3.5 h-3.5" /> To Human
          </button>
        </div>

        {/* Agent Selection */}
        {direction === 'to-agent' && (
          <div className="mb-4">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">
              Select Agent
            </label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {availableAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setTargetId(agent.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded border text-left transition-all ${
                    targetId === agent.id
                      ? 'border-purple-600 bg-purple-950/20'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <span className="text-sm">{agent.avatar}</span>
                  <div className="flex-1">
                    <span className="text-[11px] text-gray-200 font-bold">{agent.name}</span>
                    <span className="text-[9px] text-gray-500 ml-1.5 uppercase">{agent.role}</span>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      agent.status === 'online' ? 'bg-green-500' : agent.status === 'idle' ? 'bg-gray-500' : 'bg-yellow-500'
                    }`}
                  />
                </button>
              ))}
              {availableAgents.length === 0 && (
                <p className="text-[10px] text-gray-600 text-center py-4">No available agents</p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">
            Handoff Notes
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Context, blockers, next steps..."
            rows={2}
            className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-700 transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 border border-gray-700 rounded text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleHandoff}
            disabled={direction === 'to-agent' && !targetId}
            className="text-xs px-4 py-2 border border-purple-700 rounded text-purple-400 hover:text-purple-200 hover:border-purple-500 bg-purple-950/30 transition-colors font-bold tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
          >
            TRANSFER
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
