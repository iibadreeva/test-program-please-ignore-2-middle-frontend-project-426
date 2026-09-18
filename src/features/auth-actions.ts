"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AuthError } from "@/server/auth/session";
import { loginUser, logoutUser, registerUser } from "@/server/services/auth";

export type AuthFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function fail(error: unknown): AuthFormState {
  if (error instanceof AuthError) {
    return { ok: false, message: error.message };
  }
  if (error instanceof ZodError) {
    return {
      ok: false,
      message: "Проверьте поля формы",
      fieldErrors: error.flatten().fieldErrors,
    };
  }
  console.error(error);
  return { ok: false, message: "Что-то пошло не так" };
}

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
    revalidatePath("/", "layout");
    redirect("/account");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return fail(error);
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
    revalidatePath("/", "layout");
    const next = String(formData.get("next") ?? "/account");
    redirect(next.startsWith("/") ? next : "/account");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return fail(error);
  }
}

export async function logoutAction(): Promise<void> {
  await logoutUser();
  revalidatePath("/", "layout");
  redirect("/");
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
