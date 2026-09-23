import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/features/auth-actions";
import { AccountOrders } from "@/features/orders/account-orders";
import { requireUser } from "@/server/auth/session";
import { listOrders } from "@/server/services/orders";
import { accountOrderListPath, loginHref } from "@/shared/auth-next";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function AccountPage({ searchParams }: Props) {
  const { order: openOrderId } = await searchParams;
  const user = await requireUser().catch(() => null);
  if (!user) {
    redirect(loginHref(openOrderId ? accountOrderListPath(openOrderId) : "/account"));
  }

  const orders = await listOrders(user.id);

  return (
    <div data-testid="account-page" className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Личный кабинет</h1>
        <p className="mt-2 text-muted" data-testid="account-greeting">
          Здравствуйте, {user.name}
        </p>
        <p className="mt-1 font-mono text-sm text-muted" data-testid="account-email">
          {user.email}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium">Мои заказы</h2>
        <AccountOrders orders={orders} openOrderId={openOrderId} />
      </section>

      <ul className="space-y-3">
        <li>
          <Link
            href="/catalog"
            className="block border border-border bg-surface px-4 py-3 hover:border-accent"
          >
            В каталог
          </Link>
        </li>
      </ul>

      <form action={logoutAction}>
        <button
          type="submit"
          className="border border-border px-4 py-2 text-sm hover:border-danger hover:text-danger"
          data-testid="account-signout"
        >
          Выйти
        </button>
      </form>
    </div>
  );
}
