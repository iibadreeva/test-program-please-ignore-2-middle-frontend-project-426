import "server-only";

import { prisma } from "@/server/db";
import { sessionUserInclude } from "@/server/db/includes/session";

/** Доступ к Session: cookie/токены — в auth/session, cleanup — в session-cleanup. */

export async function createSessionRecord(data: {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}) {
  return prisma.session.create({ data });
}

export async function deleteSessionsByTokenHash(tokenHash: string) {
  return prisma.session.deleteMany({ where: { tokenHash } });
}

export async function findSessionWithUserByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({
    where: { tokenHash },
    include: sessionUserInclude,
  });
}

export async function deleteSessionById(id: string) {
  return prisma.session.delete({ where: { id } });
}

/** Просроченные сессии для батч-cleanup (только id). */
export async function findExpiredSessionIds(take: number) {
  return prisma.session.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true },
    take,
  });
}

export async function deleteSessionsByIds(ids: string[]) {
  return prisma.session.deleteMany({
    where: { id: { in: ids } },
  });
}
