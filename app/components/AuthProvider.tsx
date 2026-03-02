'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface Agent {
  id: string;
  username: string;
  name: string;
  role: string;
  status: string;
}

interface AuthContextType {
  agent: Agent | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (username: string, password: string, name: string, role?: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Heartbeat: send every 2 minutes while authenticated
  useEffect(() => {
    if (!agent) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    // Send initial heartbeat on login
    sendHeartbeat();

    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [agent]);

  async function sendHeartbeat() {
    try {
      await fetch('/api/agents/heartbeat', { method: 'POST' });
    } catch {
      // Silently fail
    }
  }

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error };
      }

      setAgent(data.agent);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    }
    setAgent(null);
    window.location.href = '/login';
  }, []);

  const register = useCallback(async (username: string, password: string, name: string, role?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ agent, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
