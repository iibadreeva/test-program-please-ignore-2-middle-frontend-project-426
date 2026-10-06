import "server-only";

import { prisma } from "@server/db";

/** Тонкий доступ к User: хеш/конфликты email — в services/auth. */

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  return prisma.user.create({ data });
}
