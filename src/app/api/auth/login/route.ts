import { apiError, apiOk, withApiHandler } from "@/server/http";
import { loginSchema, loginUser } from "@/server/services/auth";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "Некорректный JSON");
    }

    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Некорректные данные", parsed.error.flatten());
    }

    const user = await loginUser(parsed.data);
    return apiOk(user);
  }, "Не удалось войти");
}
