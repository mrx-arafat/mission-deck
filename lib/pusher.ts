import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Channel and event constants
export const CHAT_CHANNEL = 'mission-deck-chat';

export const EVENTS = {
  NEW_MESSAGE: 'new-message',
  CHAT_CLEARED: 'chat-cleared',
  AGENT_STATUS: 'agent-status-changed',
} as const;

// Check if Pusher is configured
export function isPusherConfigured(): boolean {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER
  );
}

// Server-side Pusher instance
let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (!isPusherConfigured()) return null;

  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServer;
}

// Client-side: check if Pusher keys are available
export function isPusherClientConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
}

// Client-side Pusher instance
let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (!isPusherClientConfigured()) return null;

  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherClient;
}

// Safely trigger a Pusher event (no-op if not configured, never throws)
export async function triggerEvent(channel: string, event: string, data: unknown) {
  try {
    const pusher = getPusherServer();
    if (pusher) {
      await pusher.trigger(channel, event, data);
    }
  } catch (err) {
    console.error('Pusher triggerEvent failed:', err);
  }
}
