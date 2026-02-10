import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'mission-deck-secret-change-me';
const TOKEN_NAME = 'mission-deck-token';
const TOKEN_EXPIRY = '100d';

export interface TokenPayload {
  agentId: string;
  username: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 100, // 100 days
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

// Get token from cookie OR Authorization: Bearer header
export async function getAuthToken(): Promise<string | null> {
  // 1. Check cookie first (browser dashboard)
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(TOKEN_NAME)?.value;
  if (cookieToken) return cookieToken;

  // 2. Check Authorization header (bot API)
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

export async function getCurrentAgent() {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const agent = await prisma.agent.findUnique({
    where: { id: payload.agentId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return agent;
}

export async function requireAuth() {
  const agent = await getCurrentAgent();
  if (!agent) {
    throw new Error('Unauthorized');
  }
  return agent;
}

export async function requireAdmin() {
  const agent = await requireAuth();
  if (agent.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return agent;
}
