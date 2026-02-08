import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'mission-deck-session';

// Edge-compatible HMAC-SHA256 using Web Crypto API
async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  // Convert to base64url
  const bytes = new Uint8Array(sig);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

async function verifySessionToken(token: string, secret: string): Promise<{ username: string } | null> {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;

    const expectedSig = await hmacSign(payload, secret);
    if (sig !== expectedSig) return null;

    const data = JSON.parse(base64urlDecode(payload));
    if (!data.username || !data.exp) return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;

    return { username: data.username };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API routes through
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const session = await verifySessionToken(token, secret);
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
