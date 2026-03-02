'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock,
  Bot,
  LogOut,
  MessageSquare,
  X,
  Shield,
  UserPlus,
  Loader2,
  Bell,
  CheckCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import KanbanBoard from './KanbanBoard';
import ChatPanel from './ChatPanel';
import { useAuth } from './AuthProvider';
import { getPusherClient, CHAT_CHANNEL, EVENTS } from '@/lib/pusher';

const CHAT_MIN_WIDTH = 280;
const CHAT_MAX_WIDTH = 600;
const CHAT_DEFAULT_WIDTH = 360;
const STORAGE_KEY = 'mission-deck-chat-width';

interface AgentInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  status: string;
  capabilities?: string[];
  updatedAt?: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
}

function getStoredWidth(): number {
  if (typeof window === 'undefined') return CHAT_DEFAULT_WIDTH;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const val = parseInt(stored, 10);
    if (!isNaN(val) && val >= CHAT_MIN_WIDTH && val <= CHAT_MAX_WIDTH) return val;
  }
  return CHAT_DEFAULT_WIDTH;
}

export default function MissionControl() {
  const { agent, logout, register } = useAuth();
  const [time, setTime] = useState(new Date());
  const [chatOpen, setChatOpen] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Agent presence
  const [onlineAgents, setOnlineAgents] = useState<AgentInfo[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch agents periodically for presence
  useEffect(() => {
    if (!agent) return;
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000); // every 30s
    return () => clearInterval(interval);
  }, [agent]);

  async function fetchAgents() {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setOnlineAgents(data.agents || []);
      }
    } catch {}
  }

  // Fetch notifications
  useEffect(() => {
    if (!agent) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [agent]);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  }

  // Pusher real-time notifications
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || !agent) return;

    const channel = pusher.subscribe(CHAT_CHANNEL);
    channel.bind(EVENTS.NEW_NOTIFICATION, (data: { agentId: string; type: string; title: string; message: string; taskId?: string }) => {
      if (data.agentId === agent.id) {
        // Add to local state immediately
        setNotifications(prev => [{
          id: Date.now().toString(),
          type: data.type,
          title: data.title,
          message: data.message,
          taskId: data.taskId,
          read: false,
          createdAt: new Date().toISOString(),
        }, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      channel.unbind(EVENTS.NEW_NOTIFICATION);
    };
  }, [agent]);

  async function markNotificationRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    } catch {}
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    } catch {}
  }

  // Hydrate stored width + detect mobile
  useEffect(() => {
    setChatWidth(getStoredWidth());
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Drag resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    resizeRef.current = { startX: clientX, startWidth: chatWidth };
    setIsResizing(true);
  }, [chatWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!resizeRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const delta = resizeRef.current.startX - clientX;
      const newWidth = Math.min(
        CHAT_MAX_WIDTH,
        Math.max(CHAT_MIN_WIDTH, resizeRef.current.startWidth + delta)
      );
      setChatWidth(newWidth);
    };

    const handleEnd = () => {
      setIsResizing(false);
      resizeRef.current = null;
      localStorage.setItem(STORAGE_KEY, String(chatWidth));
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, chatWidth]);

  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem(STORAGE_KEY, String(chatWidth));
    }
  }, [chatWidth, isResizing]);

  const isAdmin = agent?.role === 'admin';
  const agentsOnline = onlineAgents.filter(a => a.status === 'online');

  return (
    <div className="min-h-screen h-screen bg-black text-green-500 font-mono relative overflow-hidden selection:bg-cyan-900 selection:text-cyan-100 flex flex-col">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="scanline" />

      {/* --- HEADER --- */}
      <header className="border-b border-green-900/50 bg-black/80 backdrop-blur-md px-3 md:px-5 py-3 flex justify-between items-center sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="w-7 h-7 md:w-8 md:h-8 text-cyan-400" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold tracking-[0.3em] text-cyan-50 glow-text">AXIS</h1>
            <p className="text-[10px] text-green-600 tracking-[0.4em]">MISSION CONTROL</p>
          </div>

          {/* Agent Presence Indicators */}
          {agentsOnline.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 ml-4 border border-green-900/30 px-2.5 py-1 rounded bg-green-950/10">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider mr-1">Online:</span>
              {agentsOnline.map(a => (
                <div key={a.id} className="flex items-center gap-1" title={`${a.name} (${a.role})${a.capabilities?.length ? ' — ' + a.capabilities.join(', ') : ''}`}>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-green-400">{a.name}</span>
                  {a.capabilities && a.capabilities.slice(0, 2).map(cap => (
                    <span key={cap} className="text-[8px] px-1 py-0.5 rounded bg-cyan-950/30 text-cyan-500 border border-cyan-900/30">
                      {cap}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4 text-xs">
          {/* Current Agent Info */}
          {agent && (
            <div className="flex items-center gap-2 border border-green-900/30 px-2 md:px-3 py-1 rounded bg-green-950/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 hidden sm:inline">{agent.name}</span>
              {isAdmin && <Shield className="w-3 h-3 text-yellow-600" />}
            </div>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`flex items-center gap-1.5 px-2 md:px-3 py-1 rounded border transition-all relative ${
                showNotifications
                  ? 'border-cyan-700 text-cyan-400 bg-cyan-950/20'
                  : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-gray-950 border border-cyan-900/50 rounded-lg shadow-2xl shadow-cyan-900/10 overflow-hidden z-50"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                    <span className="text-[11px] font-bold text-cyan-400 tracking-wider">NOTIFICATIONS</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-80">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-600 text-xs">No notifications</div>
                    ) : (
                      notifications.slice(0, 20).map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => !notif.read && markNotificationRead(notif.id)}
                          className={`px-3 py-2.5 border-b border-gray-800/50 cursor-pointer hover:bg-gray-900/50 transition-colors ${
                            !notif.read ? 'bg-cyan-950/10 border-l-2 border-l-cyan-600' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                              notif.type === 'task_assigned' ? 'bg-cyan-500' :
                              notif.type === 'task_completed' ? 'bg-green-500' :
                              notif.type === 'task_updated' ? 'bg-purple-500' :
                              'bg-yellow-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-medium text-gray-200">{notif.title}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{notif.message}</div>
                              <div className="text-[9px] text-gray-700 mt-1">
                                {new Date(notif.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat Toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`flex items-center gap-1.5 px-2 md:px-3 py-1 rounded border transition-all ${
              chatOpen
                ? 'border-cyan-700 text-cyan-400 bg-cyan-950/20'
                : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CHAT</span>
          </button>

          {/* Admin: Register Agent */}
          {isAdmin && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1 rounded border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700 transition-all"
              title="Register new agent"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Clock */}
          <div className="hidden md:flex items-center gap-2 border border-green-900/50 px-3 py-1 rounded bg-green-950/20">
            <Clock className="w-3.5 h-3.5" />
            <span>{time.toLocaleTimeString()}</span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-2 md:px-3 py-1 rounded border border-red-900/30 text-red-700 hover:text-red-400 hover:border-red-700/50 transition-all"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* --- MAIN LAYOUT --- */}
      <div className="flex-1 flex overflow-hidden relative z-0">
        {/* Kanban Board */}
        <main className="flex-1 flex flex-col overflow-hidden p-2 md:p-4">
          <KanbanBoard onlineAgents={onlineAgents} />
        </main>

        {/* --- DESKTOP: Side panel with resize handle --- */}
        {!isMobile && chatOpen && (
          <>
            <div
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
              className={`shrink-0 w-2 cursor-col-resize flex items-center justify-center group hover:bg-cyan-900/20 transition-colors z-10 ${
                isResizing ? 'bg-cyan-900/30' : ''
              }`}
              title="Drag to resize"
            >
              <div className={`w-0.5 h-10 rounded-full transition-colors ${
                isResizing ? 'bg-cyan-500' : 'bg-gray-700 group-hover:bg-cyan-600'
              }`} />
            </div>
            <div
              className="shrink-0 overflow-hidden relative"
              style={{ width: chatWidth }}
            >
              <ChatPanel />
            </div>
          </>
        )}

        {/* --- MOBILE: Full-screen overlay --- */}
        {isMobile && (
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute inset-0 z-20 bg-black"
              >
                <div className="absolute top-2 right-2 z-30">
                  <button
                    onClick={() => setChatOpen(false)}
                    className="p-2 rounded-full bg-gray-900 border border-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ChatPanel />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Close notification dropdown on outside click */}
      {showNotifications && (
        <div className="fixed inset-0 z-[9]" onClick={() => setShowNotifications(false)} />
      )}

      {/* Register Agent Modal (Admin) */}
      <AnimatePresence>
        {showRegisterModal && (
          <RegisterAgentModal
            onClose={() => setShowRegisterModal(false)}
            onRegister={register}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Register Agent Modal ---
function RegisterAgentModal({
  onClose,
  onRegister,
}: {
  onClose: () => void;
  onRegister: (username: string, password: string, name: string, role?: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('agent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await onRegister(username, password, name, role);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } else {
      setError(result.error || 'Registration failed');
    }
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-950 border border-cyan-900/50 rounded-lg p-5 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-cyan-400 tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> REGISTER NEW AGENT
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="text-green-400 text-sm font-bold mb-2">AGENT REGISTERED</div>
            <p className="text-[10px] text-gray-500">The new agent can now login.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-950/30 border border-red-800/50 rounded px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Display Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. MOXY"
                className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-700"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. moxy"
                className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-700"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Set a strong password"
                className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-700"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded px-2 py-2 text-sm text-gray-300 focus:outline-none focus:border-cyan-700"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-4 py-2 border border-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading || !username || !password || !name}
                className="text-xs px-4 py-2 border border-cyan-700 rounded text-cyan-400 hover:text-cyan-200 bg-cyan-950/30 transition-colors font-bold tracking-wider disabled:opacity-40 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                REGISTER
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
