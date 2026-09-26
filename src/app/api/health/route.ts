import { apiOk, withApiHandler } from "@/server/http";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiHandler(
    async () => {
      await prisma.$queryRaw`SELECT 1`;
      return apiOk({ status: "ok" });
    },
    "База данных недоступна",
    { serviceUnavailableFallback: true },
  );
}
