import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { verifyPassword, createSessionToken, COOKIE_NAME, SESSION_MAX_AGE } from '../../../lib/auth';

interface User {
  username: string;
  passwordHash: string;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const usersFile = join(process.cwd(), 'users.json');
    const data = JSON.parse(readFileSync(usersFile, 'utf-8'));
    const user: User | undefined = data.users.find((u: User) => u.username === username);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createSessionToken(username);
    const response = NextResponse.json({ ok: true, username });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
