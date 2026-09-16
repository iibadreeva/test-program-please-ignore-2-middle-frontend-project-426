import { redirect } from "next/navigation";
import { LoginForm } from "@/features/login-form";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  const sp = await searchParams;
  const next = sp.next?.startsWith("/") ? sp.next : "/account";

  return (
    <div data-testid="login-page" className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-semibold">Вход</h1>
      <p className="mt-2 text-sm text-muted">Войдите, чтобы оформить заказ и смотреть историю покупок.</p>
      <LoginForm next={next} />
    </div>
  );
}
