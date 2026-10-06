"use server";

import { redirect } from "next/navigation";
import { mapDomainErrorToActionResult } from "@server/errors/map-to-action";
import { loginUser, logoutUser, registerUser } from "@server/services/auth";
import { resolveLoginNext } from "@/shared/auth-next";
import { routes } from "@/shared/routes";

export type AuthFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    const nameRaw = String(formData.get("name") ?? "").trim();
    await registerUser({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      ...(nameRaw ? { name: nameRaw } : {}),
    });
    // Шапка читает /api/auth/me на клиенте — layout больше не зависит от сессии.
    redirect(routes.account);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return mapDomainErrorToActionResult(error, "Что-то пошло не так");
  }
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    await loginUser({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    redirect(resolveLoginNext(String(formData.get("next") ?? "")));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return mapDomainErrorToActionResult(error, "Что-то пошло не так");
  }
}

export async function logoutAction(): Promise<void> {
  await logoutUser();
  redirect(routes.home);
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
