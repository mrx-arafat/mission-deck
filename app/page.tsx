'use client';

import { useAuth } from './components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Bot } from 'lucide-react';
import MissionControl from './components/MissionControl';

export default function Home() {
  const { agent, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !agent) {
      router.replace('/login');
    }
  }, [loading, agent, router]);

  if (loading || !agent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <Bot className="w-12 h-12 text-cyan-400 animate-pulse" />
          <Loader2 className="w-6 h-6 text-cyan-600 animate-spin" />
          <span className="text-xs text-green-700 tracking-wider">INITIALIZING MISSION CONTROL...</span>
        </div>
      </div>
    );
  }

  return <MissionControl />;
}
