import { createHmac, randomBytes, createHash } from 'crypto';

const COOKIE_NAME = 'mission-deck-session';
const SESSION_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }
  return secret;
}

// Password hashing with SHA-256 + salt
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const attempt = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return attempt === hash;
}

// Session token: base64({ username, exp }) + "." + hmac-signature
export function createSessionToken(username: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = Buffer.from(JSON.stringify({ username, exp })).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): { username: string } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;

    const expectedSig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
    if (sig !== expectedSig) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.username || !data.exp) return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;

    return { username: data.username };
  } catch {
    return null;
  }
}

export { COOKIE_NAME, SESSION_MAX_AGE };
