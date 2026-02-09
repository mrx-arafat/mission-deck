'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Hash, AtSign, Bot } from 'lucide-react';
import { useMissionStore } from '../lib/store';
import type { ChatMessage } from '../lib/types';

const MSG_TYPE_STYLES: Record<ChatMessage['type'], string> = {
  message: 'border-gray-800',
  system: 'border-yellow-900/50 bg-yellow-950/10',
  handoff: 'border-purple-900/50 bg-purple-950/10',
  claim: 'border-cyan-900/50 bg-cyan-950/10',
  status: 'border-green-900/50 bg-green-950/10',
};

const AGENT_COLORS: Record<string, string> = {
  axis: 'text-cyan-400',
  nova: 'text-pink-400',
  cipher: 'text-amber-400',
  forge: 'text-blue-400',
  sentinel: 'text-green-400',
  human: 'text-violet-400',
  system: 'text-yellow-400',
};

export default function TeamChat() {
  const { messages, sendMessage, agents } = useMissionStore();
  const [input, setInput] = useState('');
  const [channel] = useState('general');
  const bottomRef = useRef<HTMLDivElement>(null);

  const channelMessages = messages
    .filter(m => m.channel === channel)
    .sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length]);

  const handleSend = () => {
    if (!input.trim()) return;

    // Detect @mentions
    const mentionRegex = /@(\w+)/g;
    const mentionMatches = [...input.matchAll(mentionRegex)];
    const mentions = mentionMatches
      .map(m => agents.find(a => a.name.toLowerCase() === m[1].toLowerCase())?.id)
      .filter(Boolean) as string[];

    sendMessage({
      senderId: 'human',
      senderName: 'YOU',
      content: input.trim(),
      channel,
      type: 'message',
      mentions: mentions.length > 0 ? mentions : undefined,
    });
    setInput('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAgentAvatar = (senderId: string) => {
    if (senderId === 'human') return '👤';
    if (senderId === 'system') return '⚙️';
    return agents.find(a => a.id === senderId)?.avatar || '🤖';
  };

  const highlightMentions = (content: string) => {
    return content.replace(/@(\w+)/g, (match) => match);
  };

  return (
    <div className="flex flex-col h-full bg-black/30 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-black/50 shrink-0">
        <MessageSquare className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold text-cyan-400 tracking-wider">TEAM COMMS</span>
        <div className="flex items-center gap-1 ml-auto">
          <Hash className="w-3 h-3 text-gray-600" />
          <span className="text-[10px] text-gray-500">{channel}</span>
        </div>
      </div>

      {/* Agent Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800/50 bg-gray-950/50 shrink-0 overflow-x-auto scrollbar-hide">
        {agents.map(agent => (
          <div
            key={agent.id}
            className="flex items-center gap-1 shrink-0"
            title={`${agent.name} — ${agent.status}`}
          >
            <span className="text-xs">{agent.avatar}</span>
            <span className={`text-[9px] ${AGENT_COLORS[agent.id] || 'text-gray-400'}`}>
              {agent.name}
            </span>
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                agent.status === 'online'
                  ? 'bg-green-500'
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 kanban-column-scroll">
        <AnimatePresence initial={false}>
          {channelMessages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 p-2 rounded border ${MSG_TYPE_STYLES[msg.type]}`}
            >
              <span className="text-sm shrink-0 mt-0.5">{getAgentAvatar(msg.senderId)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold tracking-wider ${
                      AGENT_COLORS[msg.senderId] || 'text-gray-400'
                    }`}
                  >
                    {msg.senderName}
                  </span>
                  <span className="text-[9px] text-gray-600">{formatTime(msg.timestamp)}</span>
                  {msg.type !== 'message' && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        msg.type === 'system'
                          ? 'bg-yellow-900/30 text-yellow-500'
                          : msg.type === 'handoff'
                          ? 'bg-purple-900/30 text-purple-400'
                          : msg.type === 'claim'
                          ? 'bg-cyan-900/30 text-cyan-400'
                          : 'bg-green-900/30 text-green-400'
                      }`}
                    >
                      {msg.type}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed break-words">
                  {highlightMentions(msg.content)}
                </p>
                {msg.taskRef && (
                  <div className="flex items-center gap-1 mt-1">
                    <Bot className="w-2.5 h-2.5 text-gray-600" />
                    <span className="text-[9px] text-gray-600">Task ref: {msg.taskRef}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-2 bg-black/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[9px] text-gray-600 shrink-0">
            <AtSign className="w-3 h-3" />
          </div>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message the team... (@agent to mention)"
            className="flex-1 bg-gray-900/50 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-800 transition-colors placeholder:text-gray-700"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="text-cyan-500 hover:text-cyan-300 disabled:text-gray-700 transition-colors p-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
