import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderDetails } from "@/features/orders/order-details";
import { requireUser } from "@/server/auth/session";
import { getOrderById } from "@/server/services/orders";
import { checkoutSuccessPath, loginHref } from "@/shared/auth-next";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order: orderId } = await searchParams;
  const user = await requireUser().catch(() => null);
  if (!user) redirect(loginHref(checkoutSuccessPath(orderId)));

  if (!orderId) redirect("/account");

  const order = await getOrderById(user.id, orderId);
  if (!order) notFound();

  return (
    <div data-testid="order-success" className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Заказ оформлен</h1>
        <p className="mt-2 text-muted">Спасибо! Заказ оплачен и принят в работу.</p>
        <p className="mt-1 font-mono text-sm text-muted" data-testid="order-id">
          #{order.id}
        </p>
      </div>

      <div className="border border-border bg-surface p-4">
        <OrderDetails order={order} />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/account" className="text-accent hover:underline">
          В личный кабинет
        </Link>
        <Link href="/catalog" className="text-muted hover:text-accent">
          В каталог
        </Link>
      </div>
    </div>
  );
}
