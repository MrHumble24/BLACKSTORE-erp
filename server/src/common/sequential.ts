import { Prisma } from '@prisma/client';

/**
 * Runs lazy Prisma operations one after another. Inside an interactive transaction all
 * queries share one connection, so firing them together (Promise.all) makes the pg driver
 * warn and risks interleaving; chaining keeps them strictly sequential.
 */
export function runSequential(ops: Prisma.PrismaPromise<unknown>[]): Promise<unknown> {
  return ops.reduce<Promise<unknown>>((prev, op) => prev.then(() => op), Promise.resolve());
}
