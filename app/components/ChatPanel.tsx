'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Trash2,
  Megaphone,
  X,
  Loader2,
  MessageSquare,
  Users,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthProvider';

interface AgentInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  status: string;
}

interface ChatMessage {
  id: string;
  content: string;
  type: 'message' | 'instruction' | 'system';
  agentId: string;
  createdAt: string;
  agent: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
}

const POLL_INTERVAL = 2000; // 2 seconds

export default function ChatPanel() {
  const { agent } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [showInstructModal, setShowInstructModal] = useState(false);
  const [instructContent, setInstructContent] = useState('');
  const [showAgentList, setShowAgentList] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = agent?.role === 'admin';

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'instant',
    });
  }, []);

  // Track if user is at the bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 60;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(atBottom);
  }, []);

  // Fetch all messages (initial load)
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch('/api/chat/messages?limit=100');
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
          if (data.messages.length > 0) {
            lastMessageTimeRef.current = data.messages[data.messages.length - 1].createdAt;
          }
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }
    fetchMessages();
  }, []);

  // Fetch agents
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents);
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      }
    }
    fetchAgents();

    // Re-fetch agents periodically for status updates
    const agentPoll = setInterval(fetchAgents, 10000);
    return () => clearInterval(agentPoll);
  }, []);

  // Polling for new messages (real-time without Pusher)
  useEffect(() => {
    async function pollMessages() {
      if (!lastMessageTimeRef.current) return;

      try {
        const res = await fetch(
          `/api/chat/messages?after=${encodeURIComponent(lastMessageTimeRef.current)}&limit=50`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.messages.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMessages = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
              if (newMessages.length === 0) return prev;
              return [...prev, ...newMessages];
            });
            lastMessageTimeRef.current = data.messages[data.messages.length - 1].createdAt;
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }

    // Also check if messages were cleared
    async function pollForCleared() {
      try {
        const res = await fetch('/api/chat/messages?limit=1');
        if (res.ok) {
          const data = await res.json();
          if (data.messages.length === 0 && messages.length > 0) {
            setMessages([]);
            lastMessageTimeRef.current = null;
          }
        }
      } catch {
        // ignore
      }
    }

    pollRef.current = setInterval(() => {
      pollMessages();
      pollForCleared();
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [messages.length]);

  // Try to set up Pusher if configured (upgrades to true WebSocket)
  useEffect(() => {
    let channel: ReturnType<typeof import('pusher-js').default.prototype.subscribe> | null = null;

    async function setupPusher() {
      try {
        const { getPusherClient, CHAT_CHANNEL, EVENTS } = await import('@/lib/pusher');
        const pusher = getPusherClient();
        if (!pusher) return; // Pusher not configured, stick with polling

        channel = pusher.subscribe(CHAT_CHANNEL);

        channel.bind(EVENTS.NEW_MESSAGE, (data: ChatMessage) => {
          setMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev;
            lastMessageTimeRef.current = data.createdAt;
            return [...prev, data];
          });
        });

        channel.bind(EVENTS.CHAT_CLEARED, () => {
          setMessages([]);
          lastMessageTimeRef.current = null;
        });

        channel.bind(EVENTS.AGENT_STATUS, (data: { agentId: string; status: string }) => {
          setAgents(prev =>
            prev.map(a =>
              a.id === data.agentId ? { ...a, status: data.status } : a
            )
          );
        });

        // If Pusher is connected, reduce polling frequency
        if (pollRef.current) {
          clearInterval(pollRef.current);
        }
      } catch {
        // Pusher not available, polling continues
      }
    }

    setupPusher();

    return () => {
      if (channel) {
        channel.unbind_all();
      }
    };
  }, []);

  // Auto-scroll on new messages (only if already at bottom)
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Initial scroll
  useEffect(() => {
    if (!loadingMessages) {
      scrollToBottom(false);
    }
  }, [loadingMessages, scrollToBottom]);

  // Send message
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        // Add message immediately for sender (prevents delay)
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          lastMessageTimeRef.current = data.message.createdAt;
          return [...prev, data.message];
        });
      } else {
        console.error('Failed to send message');
        setInput(content);
      }
    } catch (err) {
      console.error('Send error:', err);
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  // Clear chat (admin)
  async function handleClearChat() {
    if (!confirm('Clear all chat messages? This cannot be undone.')) return;

    try {
      const res = await fetch('/api/chat/messages', { method: 'DELETE' });
      if (res.ok) {
        setMessages([]);
        lastMessageTimeRef.current = null;
      }
    } catch (err) {
      console.error('Clear chat error:', err);
    }
  }

  // Send instruction (admin)
  async function handleInstruct(e: React.FormEvent) {
    e.preventDefault();
    if (!instructContent.trim()) return;

    try {
      const res = await fetch('/api/chat/instruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: instructContent.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          lastMessageTimeRef.current = data.message.createdAt;
          return [...prev, data.message];
        });
        setInstructContent('');
        setShowInstructModal(false);
      }
    } catch (err) {
      console.error('Instruct error:', err);
    }
  }

  const onlineAgents = agents.filter(a => a.status === 'online');

  return (
    <div className="flex flex-col h-full border-l border-green-900/30 bg-black/40">
      {/* Chat Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-green-900/30 bg-black/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400 tracking-wider">NEURAL LINK</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowInstructModal(true)}
                  className="p-1.5 text-yellow-600 hover:text-yellow-400 transition-colors"
                  title="Send instruction to all agents"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleClearChat}
                  className="p-1.5 text-red-700 hover:text-red-400 transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowAgentList(!showAgentList)}
              className="flex items-center gap-1 p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
              title="Show online agents"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="text-[10px]">{onlineAgents.length}</span>
            </button>
          </div>
        </div>

        {/* Agent List Dropdown */}
        <AnimatePresence>
          {showAgentList && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="space-y-1 py-1 border-t border-gray-800/50">
                {agents.map(a => (
                  <div key={a.id} className="flex items-center gap-2 py-1 px-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${a.status === 'online' ? 'bg-green-500' : 'bg-gray-600'}`} />
                    <span className="text-[10px] text-gray-400">{a.name}</span>
                    {a.role === 'admin' && (
                      <Shield className="w-2.5 h-2.5 text-yellow-600" />
                    )}
                    <span className="text-[9px] text-gray-700 ml-auto">
                      {a.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                ))}
                {agents.length === 0 && (
                  <p className="text-[10px] text-gray-700 py-1">No agents registered</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1 kanban-column-scroll"
      >
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-cyan-700 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-700">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No messages yet</p>
            <p className="text-[10px] mt-1">Start the conversation</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwnMessage={msg.agentId === agent?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom indicator */}
      {!isAtBottom && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-16 right-4 bg-cyan-950/80 border border-cyan-800/50 rounded-full p-1.5 text-cyan-400 hover:bg-cyan-900/80 transition-colors z-10"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="shrink-0 px-3 py-2 border-t border-green-900/30 bg-black/60">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-black/60 border border-gray-800 rounded px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-700 transition-colors placeholder:text-gray-700"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-2 border border-cyan-800/50 rounded text-cyan-500 hover:text-cyan-300 hover:border-cyan-600 bg-cyan-950/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </form>

      {/* Instruction Modal (Admin) */}
      <AnimatePresence>
        {showInstructModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowInstructModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-950 border border-yellow-900/50 rounded-lg p-5 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-yellow-400 tracking-wider flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> BROADCAST INSTRUCTION
                </h3>
                <button
                  onClick={() => setShowInstructModal(false)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] text-gray-500 mb-3">
                This instruction will be broadcast to all agents in the channel.
              </p>

              <form onSubmit={handleInstruct}>
                <textarea
                  value={instructContent}
                  onChange={e => setInstructContent(e.target.value)}
                  placeholder="Enter instruction for all agents..."
                  rows={4}
                  className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-yellow-700 transition-colors resize-none mb-3"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInstructModal(false)}
                    className="text-xs px-4 py-2 border border-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={!instructContent.trim()}
                    className="text-xs px-4 py-2 border border-yellow-700 rounded text-yellow-400 hover:text-yellow-200 bg-yellow-950/30 transition-colors font-bold tracking-wider disabled:opacity-40"
                  >
                    BROADCAST
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Message Bubble ---
function MessageBubble({
  message,
  isOwnMessage,
}: {
  message: ChatMessage;
  isOwnMessage: boolean;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.type === 'instruction') {
    return (
      <div className="my-2">
        <div className="bg-yellow-950/20 border border-yellow-900/40 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Megaphone className="w-3 h-3 text-yellow-500" />
            <span className="text-[10px] font-bold text-yellow-500 tracking-wider">
              INSTRUCTION FROM {message.agent.name.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-yellow-200/80 leading-relaxed">{message.content}</p>
          <span className="text-[9px] text-yellow-800 mt-1 block">{time}</span>
        </div>
      </div>
    );
  }

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-1.5">
        <span className="text-[10px] text-gray-600 bg-gray-900/30 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} my-1`}>
      {!isOwnMessage && (
        <div className="flex items-center gap-1.5 mb-0.5 px-1">
          <span className="text-[10px] font-bold text-cyan-600">
            {message.agent.name}
          </span>
          {message.agent.role === 'admin' && (
            <Shield className="w-2.5 h-2.5 text-yellow-600" />
          )}
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-lg px-3 py-1.5 ${
          isOwnMessage
            ? 'bg-cyan-950/40 border border-cyan-900/40 text-cyan-100'
            : 'bg-gray-900/50 border border-gray-800/50 text-gray-200'
        }`}
      >
        <p className="text-xs leading-relaxed break-words">{message.content}</p>
      </div>
      <span className="text-[9px] text-gray-700 mt-0.5 px-1">{time}</span>
    </div>
  );
}
