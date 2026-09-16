import Link from "next/link";
import { logoutAction } from "@/features/auth-actions";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

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

      <ul className="space-y-3">
        <li>
          <Link
            href="/account/orders"
            className="block border border-border bg-surface px-4 py-3 hover:border-accent"
            data-testid="account-orders-link"
          >
            История заказов
          </Link>
        </li>
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
          data-testid="logout-button"
        >
          Выйти
        </button>
      </form>
    </div>
  );
}
