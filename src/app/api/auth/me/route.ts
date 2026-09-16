import { apiError, apiOk } from "@/server/http";
import { getMe } from "@/server/services/auth";

export async function GET() {
  try {
    const user = await getMe();
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Требуется вход");
    }
    return apiOk(user);
  } catch (error) {
    console.error(error);
    return apiError(503, "INTERNAL_ERROR", "Не удалось получить профиль");
  }
}
