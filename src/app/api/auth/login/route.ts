import { z } from "zod";
import { apiError, apiOk } from "@/server/http";
import { AuthError } from "@/server/auth/session";
import { loginSchema, loginUser } from "@/server/services/auth";

export async function POST(request: Request) {
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

  try {
    const user = await loginUser(parsed.data);
    return apiOk(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Некорректные данные", error.flatten());
    }
    if (error instanceof AuthError) {
      return apiError(
        error.code === "UNAUTHORIZED" ? 401 : 400,
        error.code,
        error.message,
      );
    }
    console.error(error);
    return apiError(503, "INTERNAL_ERROR", "Не удалось войти");
  }
}
