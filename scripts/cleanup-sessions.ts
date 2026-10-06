/**
 * Удаляет просроченные сессии батчами. Запуск: npm run sessions:cleanup
 */
import { cleanupAllExpiredSessions } from "../server/auth/session-cleanup";
import { prisma } from "../server/db";

async function main() {
  const count = await cleanupAllExpiredSessions();
  console.log(`Удалено просроченных сессий: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
