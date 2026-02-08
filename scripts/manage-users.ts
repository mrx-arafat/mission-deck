import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import { join } from 'path';

const USERS_FILE = join(process.cwd(), 'users.json');

interface User {
  username: string;
  passwordHash: string;
}

interface UsersData {
  users: User[];
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return `${salt}:${hash}`;
}

function loadUsers(): UsersData {
  if (!existsSync(USERS_FILE)) {
    return { users: [] };
  }
  return JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
}

function saveUsers(data: UsersData): void {
  writeFileSync(USERS_FILE, JSON.stringify(data, null, 2) + '\n');
}

const [, , command, username, password] = process.argv;

if (!command) {
  console.log('Usage:');
  console.log('  npx tsx scripts/manage-users.ts add <username> <password>');
  console.log('  npx tsx scripts/manage-users.ts remove <username>');
  console.log('  npx tsx scripts/manage-users.ts list');
  process.exit(0);
}

if (command === 'list') {
  const data = loadUsers();
  if (data.users.length === 0) {
    console.log('No users found.');
  } else {
    console.log('Users:');
    data.users.forEach((u) => console.log(`  - ${u.username}`));
  }
  process.exit(0);
}

if (command === 'add') {
  if (!username || !password) {
    console.error('Usage: npx tsx scripts/manage-users.ts add <username> <password>');
    process.exit(1);
  }
  const data = loadUsers();
  const existing = data.users.find((u) => u.username === username);
  if (existing) {
    existing.passwordHash = hashPassword(password);
    console.log(`Updated password for user: ${username}`);
  } else {
    data.users.push({ username, passwordHash: hashPassword(password) });
    console.log(`Added user: ${username}`);
  }
  saveUsers(data);
  process.exit(0);
}

if (command === 'remove') {
  if (!username) {
    console.error('Usage: npx tsx scripts/manage-users.ts remove <username>');
    process.exit(1);
  }
  const data = loadUsers();
  const before = data.users.length;
  data.users = data.users.filter((u) => u.username !== username);
  if (data.users.length === before) {
    console.error(`User not found: ${username}`);
    process.exit(1);
  }
  saveUsers(data);
  console.log(`Removed user: ${username}`);
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(1);
