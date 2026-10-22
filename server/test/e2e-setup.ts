import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

/** Boots the full Nest app with the same global config as production (one per e2e suite). */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<App>();
  configureApp(app);
  await app.init();
  return app;
}

/** Logs in through the real cookie flow and returns an authenticated supertest agent. */
export async function loginAs(app: INestApplication<App>, phone: string, password = 'pass12345') {
  const agent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ phone, password }).expect(200);
  return agent;
}

/** A Staff + Admin user pair seeded for a suite, with their phones for login and cleanup. */
export interface SeededUsers {
  staffPhone: string;
  adminPhone: string;
}

/** Creates one Staff and one Admin user with unique phones and the shared test password. */
export async function seedUsers(prisma: PrismaService): Promise<SeededUsers> {
  const unique = `${Date.now() % 10_000_000}${Math.floor(Math.random() * 1000)}`.slice(0, 7);
  const staffPhone = `+99899${unique}`;
  const adminPhone = `+99897${unique}`;
  const [staff, admin] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: 'Staff' } }),
    prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } }),
  ]);
  const passwordHash = await bcrypt.hash('pass12345', 4);
  await prisma.user.create({ data: { name: 'E2E', phone: staffPhone, passwordHash, roleId: staff.id } });
  await prisma.user.create({ data: { name: 'E2E-Admin', phone: adminPhone, passwordHash, roleId: admin.id } });
  return { staffPhone, adminPhone };
}

/** Removes the seeded users and their audit rows; call last in a suite's afterAll. */
export async function cleanupUsers(prisma: PrismaService, phones: string[]): Promise<void> {
  const users = await prisma.user.findMany({
    where: { phone: { in: phones } },
    select: { id: true },
  });
  await prisma.auditLog.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { phone: { in: phones } } });
}
