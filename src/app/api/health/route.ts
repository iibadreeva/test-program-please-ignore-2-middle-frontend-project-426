import { apiError, apiOk } from "@/server/http";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return apiOk({ status: "ok" });
  } catch {
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}
