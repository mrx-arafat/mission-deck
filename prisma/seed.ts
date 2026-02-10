import { PrismaClient } from '../app/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...\n');

  // Create AXIS (admin / lead agent)
  const axisPassword = await bcrypt.hash('password', 10);
  const axis = await prisma.agent.upsert({
    where: { username: 'axis' },
    update: {},
    create: {
      username: 'axis',
      password: axisPassword,
      name: 'AXIS',
      role: 'admin',
      status: 'offline',
    },
  });
  console.log(`Created agent: ${axis.name} (${axis.role})`);

  // Create MOXY (agent)
  const moxyPassword = await bcrypt.hash('password', 10);
  const moxy = await prisma.agent.upsert({
    where: { username: 'moxy' },
    update: {},
    create: {
      username: 'moxy',
      password: moxyPassword,
      name: 'MOXY',
      role: 'agent',
      status: 'offline',
    },
  });
  console.log(`Created agent: ${moxy.name} (${moxy.role})`);

  console.log('\n--- Seed completed ---');
  console.log('\nAgent Credentials:');
  console.log('  AXIS  -> username: axis  | password: password | role: admin');
  console.log('  MOXY  -> username: moxy  | password: password | role: agent');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
