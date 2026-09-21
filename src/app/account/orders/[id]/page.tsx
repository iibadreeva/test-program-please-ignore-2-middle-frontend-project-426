import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductImage } from "@/components/product-image";
import { ClearCartOnPlaced } from "@/features/cart/clear-cart-on-placed";
import { formatPrice } from "@/shared/format";
import { requireUser } from "@/server/auth/session";
import { getOrderById, orderStatusLabel } from "@/server/services/orders";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
};

export default async function AccountOrderDetailPage({ params, searchParams }: Props) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login?next=/account/orders");

  const { id } = await params;
  const sp = await searchParams;
  const order = await getOrderById(user.id, id);
  if (!order) notFound();

  return (
    <div data-testid="order-detail-page" className="space-y-6">
      <ClearCartOnPlaced orderId={order.id} placed={sp.placed === "1"} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Заказ</h1>
          <p className="mt-1 font-mono text-sm text-muted" data-testid="order-id">
            #{order.id}
          </p>
        </div>
        <Link href="/account/orders" className="text-sm text-muted hover:text-accent">
          Все заказы
        </Link>
      </div>

      <dl className="grid gap-3 border border-border bg-surface p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Статус</dt>
          <dd data-testid="order-status">{orderStatusLabel(order.status)}</dd>
        </div>
        <div>
          <dt className="text-muted">Дата</dt>
          <dd>{new Date(order.createdAt).toLocaleString("ru-RU")}</dd>
        </div>
        <div>
          <dt className="text-muted">Получение</dt>
          <dd data-testid="order-delivery-type">
            {order.deliveryType === "DELIVERY" ? "Доставка" : "Самовывоз"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Контакты</dt>
          <dd>
            {order.recipientName}, {order.phone}
          </dd>
        </div>
        {order.deliveryType === "DELIVERY" && order.address ? (
          <div className="sm:col-span-2">
            <dt className="text-muted">Адрес</dt>
            <dd data-testid="order-address">{order.address}</dd>
          </div>
        ) : null}
        {order.pickupPoint ? (
          <div className="sm:col-span-2">
            <dt className="text-muted">Пункт выдачи</dt>
            <dd data-testid="order-pickup">
              {order.pickupPoint.name} — {order.pickupPoint.address}
            </dd>
          </div>
        ) : null}
        {order.comment ? (
          <div className="sm:col-span-2">
            <dt className="text-muted">Комментарий</dt>
            <dd>{order.comment}</dd>
          </div>
        ) : null}
      </dl>

      <ul className="space-y-3" data-testid="order-items">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="grid gap-3 border border-border bg-surface p-3 sm:grid-cols-[72px_1fr_auto]"
            data-testid="order-item"
          >
            <ProductImage
              src={item.imageUrlSnapshot || null}
              alt={item.titleSnapshot}
              className="aspect-square w-[72px]"
            />
            <div>
              <p className="font-medium">{item.titleSnapshot}</p>
              <p className="mt-1 font-mono text-sm text-muted">
                {formatPrice(item.priceSnapshot)} × {item.quantity}
              </p>
            </div>
            <p className="font-mono text-accent">{formatPrice(item.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <p className="text-right font-mono text-2xl text-accent" data-testid="order-total">
        {formatPrice(order.total)}
      </p>
    </div>
  );
}
