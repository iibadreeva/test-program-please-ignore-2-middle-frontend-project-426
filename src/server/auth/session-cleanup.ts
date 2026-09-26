import { prisma } from "@/server/db";

/** Доля createSession, на которых запускаем opportunistic cleanup (~1/20). */
export const SESSION_CLEANUP_PROBABILITY = 0.05;

/** Сколько просроченных сессий удаляем за один проход. */
export const SESSION_CLEANUP_BATCH_SIZE = 100;

/**
 * Один батч удаления просроченных сессий.
 * Используется opportunistic cleanup и cron (`cleanupAllExpiredSessions`).
 */
export async function cleanupExpiredSessionsBatch(): Promise<number> {
  const expired = await prisma.session.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true },
    take: SESSION_CLEANUP_BATCH_SIZE,
  });
  if (expired.length === 0) return 0;

  const result = await prisma.session.deleteMany({
    where: { id: { in: expired.map((session) => session.id) } },
  });
  return result.count;
}

/**
 * Редкий батч-cleanup на пути логина. Ошибки глотаем — логин не должен падать.
 * Основной путь — `npm run sessions:cleanup` → `cleanupAllExpiredSessions`.
 * @param random — инъекция для тестов (по умолчанию Math.random).
 */
export async function maybeCleanupExpiredSessions(
  random: () => number = Math.random,
): Promise<number> {
  if (random() >= SESSION_CLEANUP_PROBABILITY) return 0;

  try {
    return await cleanupExpiredSessionsBatch();
  } catch (error) {
    console.error("[auth] opportunistic session cleanup failed", error);
    return 0;
  }
}

/**
 * Фоновый opportunistic cleanup: не ждём батч на пути логина.
 * Ошибки уже глотаются в `maybeCleanupExpiredSessions`.
 */
export function scheduleOpportunisticSessionCleanup(
  random: () => number = Math.random,
): void {
  void maybeCleanupExpiredSessions(random);
}

/**
 * Полный cleanup батчами (cron / `npm run sessions:cleanup`).
 * Ошибки пробрасывает — скрипт должен завершиться с ненулевым кодом.
 */
export async function cleanupAllExpiredSessions(): Promise<number> {
  let total = 0;
  for (;;) {
    const deleted = await cleanupExpiredSessionsBatch();
    if (deleted === 0) break;
    total += deleted;
  }
  return total;
}
