// Seeds the Admin and Staff roles and the first Admin user. Safe to run many times.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLE,
  ALL_PERMISSIONS,
  STAFF_PERMISSIONS,
  STAFF_ROLE,
  SUPER_ADMIN_ROLE,
} from '../src/common/permissions';
import { seedMasterData } from './seed/master-data';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} must be set to run the seed`);
  return value;
}

/**
 * Create-only seed of one user from env vars `${envPrefix}_PHONE`/`_PASSWORD`.
 * Never overwrites an existing user's password; skips with a warning when either
 * env var is empty so no guessable default account is created.
 */
async function seedUser(
  prisma: PrismaClient,
  opts: { envPrefix: string; roleName: string; name: string; label: string },
) {
  const phone = process.env[`${opts.envPrefix}_PHONE`];
  const password = process.env[`${opts.envPrefix}_PASSWORD`];
  if (!phone || !password) {
    console.warn(
      `${opts.envPrefix}_PHONE/${opts.envPrefix}_PASSWORD not set — skipping ${opts.label}.`,
    );
    return;
  }
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: opts.roleName },
  });
  await prisma.user.upsert({
    where: { phone },
    update: {}, // keep an existing user's password untouched
    create: {
      name: opts.name,
      phone,
      passwordHash: await bcrypt.hash(password, 10),
      roleId: role.id,
      isActive: true,
    },
  });
}

async function main(prisma: PrismaClient) {
  const roles = [
    // Admin excludes the super-only powers; re-seeding never re-grants them (F12).
    { name: ADMIN_ROLE, permissions: ADMIN_PERMISSIONS },
    { name: STAFF_ROLE, permissions: STAFF_PERMISSIONS },
    // SuperAdmin sits above Admin and holds every permission.
    { name: SUPER_ADMIN_ROLE, permissions: [...ALL_PERMISSIONS] },
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
  // Dedicated super-admin, separate from the owner's Admin account (F12).
  await seedUser(prisma, {
    envPrefix: 'SUPER_ADMIN',
    roleName: SUPER_ADMIN_ROLE,
    name: 'Super Admin',
    label: 'super-admin user',
  });
  // App Store review demo login as Staff (blind to cost/profit) (F35).
  await seedUser(prisma, {
    envPrefix: 'DEMO',
    roleName: STAFF_ROLE,
    name: 'App Review Demo',
    label: 'demo user',
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
