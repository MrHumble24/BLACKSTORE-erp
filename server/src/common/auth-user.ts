import { Prisma } from '@prisma/client';
import { Request } from 'express';

/** Supported UI languages (PRD NFR Language: Uzbek, Russian and English). */
export const LANGUAGES = ['uz', 'ru', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Fields of a user that may leave the server. Never includes passwordHash. */
export const userSelect = {
  id: true,
  name: true,
  phone: true,
  language: true,
  isActive: true,
  createdAt: true,
  role: { select: { id: true, name: true, permissions: true } },
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

/** Request after JwtAuthGuard has attached the logged-in user. */
export type AuthRequest = Request & { user?: PublicUser };
