import { PrismaClient } from '../app/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create AXIS (admin) - first agent gets admin role automatically
  const axisPassword = await bcrypt.hash('axis-admin-2024', 10);
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

  console.log('Seed completed.');
  console.log('\nDefault login:');
  console.log('  Username: axis');
  console.log('  Password: axis-admin-2024');
  console.log('\nChange the password after first login!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
