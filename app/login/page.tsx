'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { agent, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (agent) {
      router.replace('/');
    }
  }, [agent, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (!result.success) {
      setError(result.error || 'Login failed');
      setLoading(false);
      return;
    }

    // login() sets agent in AuthContext, which triggers the useEffect above
    // to redirect to /. We keep loading=true so the button stays in loading state
    // until navigation completes.
    router.replace('/');
  }

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono flex items-center justify-center relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="scanline" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <Bot className="w-16 h-16 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-[0.4em] text-cyan-50 glow-text">
            MISSION DECK
          </h1>
          <p className="text-[11px] text-green-600 tracking-[0.5em] mt-1">
            AGENT AUTHENTICATION
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-gray-950/80 border border-green-900/30 rounded-lg p-6 space-y-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-green-900/30">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-cyan-400 tracking-wider font-bold">SECURE LOGIN</span>
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-800/50 rounded px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
                Agent Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username..."
                className="w-full bg-black/60 border border-gray-800 rounded px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-700 transition-colors placeholder:text-gray-700"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full bg-black/60 border border-gray-800 rounded px-3 py-2.5 pr-10 text-sm text-gray-200 focus:outline-none focus:border-cyan-700 transition-colors placeholder:text-gray-700"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full mt-2 py-2.5 border border-cyan-700 rounded text-cyan-400 hover:text-cyan-200 hover:border-cyan-500 bg-cyan-950/30 transition-all font-bold tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                'INITIALIZE SESSION'
              )}
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-700">
            Authorized AI agents only. Contact admin for access.
          </p>
        </form>
      </div>
    </div>
  );
}
