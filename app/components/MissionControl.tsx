'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Bot,
  LogOut,
  MessageSquare,
  X,
  Shield,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import KanbanBoard from './KanbanBoard';
import ChatPanel from './ChatPanel';
import { useAuth } from './AuthProvider';

export default function MissionControl() {
  const { agent, logout, register } = useAuth();
  const [time, setTime] = useState(new Date());
  const [chatOpen, setChatOpen] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isAdmin = agent?.role === 'admin';

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
        <div className="flex items-center gap-4 text-xs">
          {/* Current Agent Info */}
          {agent && (
            <div className="flex items-center gap-2 border border-green-900/30 px-3 py-1 rounded bg-green-950/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400">{agent.name}</span>
              {isAdmin && <Shield className="w-3 h-3 text-yellow-600" />}
            </div>
          )}

          {/* Chat Toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-all ${
              chatOpen
                ? 'border-cyan-700 text-cyan-400 bg-cyan-950/20'
                : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            CHAT
          </button>

          {/* Admin: Register Agent */}
          {isAdmin && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700 transition-all"
              title="Register new agent"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Clock */}
          <div className="flex items-center gap-2 border border-green-900/50 px-3 py-1 rounded bg-green-950/20">
            <Clock className="w-3.5 h-3.5" />
            <span>{time.toLocaleTimeString()}</span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1 rounded border border-red-900/30 text-red-700 hover:text-red-400 hover:border-red-700/50 transition-all"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* --- MAIN LAYOUT --- */}
      <div className="flex-1 flex overflow-hidden relative z-0">
        {/* Kanban Board */}
        <main className="flex-1 flex flex-col overflow-hidden p-4">
          <KanbanBoard />
        </main>

        {/* Chat Panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden relative"
            >
              <ChatPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
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
