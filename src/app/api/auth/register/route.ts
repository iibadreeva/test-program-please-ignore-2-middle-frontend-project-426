import { z } from "zod";
import { apiError, apiOk } from "@/server/http";
import { AuthError } from "@/server/auth/session";
import { registerSchema, registerUser } from "@/server/services/auth";

export async function POST(request: Request) {
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

  try {
    const user = await registerUser(parsed.data);
    return apiOk(user, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Некорректные данные", error.flatten());
    }
    if (error instanceof AuthError) {
      const status = error.code === "CONFLICT" ? 409 : error.code === "UNAUTHORIZED" ? 401 : 400;
      return apiError(status, error.code, error.message);
    }
    console.error(error);
    return apiError(503, "INTERNAL_ERROR", "Не удалось зарегистрироваться");
  }
}
