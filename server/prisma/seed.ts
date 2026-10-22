// Seeds the Admin and Staff roles and the first Admin user. Safe to run many times.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ADMIN_ROLE,
  ALL_PERMISSIONS,
  STAFF_PERMISSIONS,
  STAFF_ROLE,
} from '../src/common/permissions';
import { seedMasterData } from './seed/master-data';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} must be set to run the seed`);
  return value;
}

async function main(prisma: PrismaClient) {
  const roles = [
    { name: ADMIN_ROLE, permissions: [...ALL_PERMISSIONS] },
    { name: STAFF_ROLE, permissions: STAFF_PERMISSIONS },
  ];
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
  }

  const admin = await prisma.role.findUniqueOrThrow({
    where: { name: ADMIN_ROLE },
  });
  const phone = requireEnv('ADMIN_PHONE');
  // update: {} keeps an existing admin's password and details untouched.
  await prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      name: 'Admin',
      phone,
      passwordHash: await bcrypt.hash(requireEnv('ADMIN_PASSWORD'), 10),
      roleId: admin.id,
    },
  });
  await seedMasterData(prisma);
  console.log('Seed done: roles, admin user, locations, categories and the OWN investor.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }),
});
main(prisma)
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
