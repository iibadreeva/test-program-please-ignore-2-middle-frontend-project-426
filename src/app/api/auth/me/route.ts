import { apiError, apiOk, withApiHandler } from "@server/http";
import { getMe } from "@server/services/auth";

/** Сессия не должна попадать в CDN / HTTP-кэш браузера. */
const AUTH_ME_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

export async function GET() {
  return withApiHandler(async () => {
    const user = await getMe();
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Требуется вход", undefined, AUTH_ME_HEADERS);
    }
    return apiOk(user, 200, AUTH_ME_HEADERS);
  }, "Не удалось получить профиль");
}
