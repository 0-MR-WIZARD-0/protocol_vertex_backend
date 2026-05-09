import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

dotenv.config({
  path: envFile,
});

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;

  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(`ADMIN_EMAIL or ADMIN_PASSWORD missing in ${envFile}`);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Admin already exists');
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      role: 'ADMIN',
    },
  });

  console.log('Admin created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
