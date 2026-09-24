import { apiError, apiOk, withApiHandler } from "@/server/http";
import { getMe } from "@/server/services/auth";

export async function GET() {
  return withApiHandler(async () => {
    const user = await getMe();
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Требуется вход");
    }
    return apiOk(user);
  }, "Не удалось получить профиль");
}
