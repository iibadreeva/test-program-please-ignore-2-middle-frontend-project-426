import { PrismaClient } from "@prisma/client";
import { seedCatalog } from "./seed/seed-catalog";

const prisma = new PrismaClient();

/** Ключ session/xact advisory lock: параллельные контейнеры не гоняют upsert'ы. */
const SEED_LOCK_KEY = 4_264_260_001;

async function main() {
  console.log("Seeding database (idempotent)...");

  // xact-lock держится на одной connection до конца TX — в отличие от
  // session pg_advisory_lock через пул Prisma (lock/unlock на разных conn).
  // Вся каталожная запись намеренно в одной TX: атомарность + корректный lock
  // важнее скорости; при росте каталога увеличьте timeout или вынесите
  // тяжёлые upsert'ы за пределы демо-seed.
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SEED_LOCK_KEY})`;
      await seedCatalog(tx);
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
