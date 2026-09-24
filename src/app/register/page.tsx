import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth/register-form";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <div data-testid="register-page" className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-semibold">Регистрация</h1>
      <p className="mt-2 text-sm text-muted">Создайте аккаунт — гостевая корзина сохранится после входа.</p>
      <RegisterForm />
    </div>
  );
}
