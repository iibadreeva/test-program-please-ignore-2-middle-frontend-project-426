import { apiError, apiOk, withApiHandler } from "@/server/http";
import { registerSchema, registerUser } from "@/server/services/auth";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "Некорректный JSON");
    }

    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Некорректные данные", parsed.error.flatten());
    }

    const user = await registerUser(parsed.data);
    return apiOk(user, 201);
  }, "Не удалось зарегистрироваться");
}
