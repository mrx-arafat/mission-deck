'use client';

import React, { useState } from 'react';
import { Lock, User, AlertCircle, Bot } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      window.location.href = '/';
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono flex items-center justify-center relative overflow-hidden selection:bg-cyan-900 selection:text-cyan-100">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="scanline" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Bot className="w-16 h-16 text-cyan-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-[0.3em] text-cyan-50 glow-text">AXIS</h1>
          <p className="text-xs text-green-600 tracking-[0.5em] mt-1">MISSION CONTROL</p>
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-800 to-transparent" />
          <p className="text-xs text-green-700 mt-3 tracking-wider">AUTHENTICATION REQUIRED</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="border border-green-900/60 rounded-lg bg-black/60 backdrop-blur-sm p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/30 border border-red-900/50 rounded px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs text-green-600 mb-1.5 tracking-wider">
                AGENT ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-green-950/20 border border-green-900/50 rounded px-3 py-2.5 pl-10 text-sm text-cyan-50 placeholder-green-800 focus:outline-none focus:border-cyan-700 focus:ring-1 focus:ring-cyan-700/30 transition-colors"
                  placeholder="Enter agent identifier"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs text-green-600 mb-1.5 tracking-wider">
                ACCESS CODE
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-green-950/20 border border-green-900/50 rounded px-3 py-2.5 pl-10 text-sm text-cyan-50 placeholder-green-800 focus:outline-none focus:border-cyan-700 focus:ring-1 focus:ring-cyan-700/30 transition-colors"
                  placeholder="Enter access code"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-950/40 border border-cyan-800/60 text-cyan-100 rounded-lg py-2.5 text-sm tracking-wider hover:bg-cyan-900/40 hover:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                AUTHENTICATING...
              </span>
            ) : (
              'INITIALIZE SESSION'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-green-800 tracking-wider">SESSION DURATION: 90 DAYS</p>
        </div>
      </div>
    </div>
  );
}
