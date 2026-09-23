import type { Order } from "@/shared/api-contract";
import { formatPrice } from "@/shared/format";
import { orderStatusLabel } from "@/shared/order-status";

type Props = {
  order: Order;
  /** Показать способ получения и контакты (на success — да, в списке кабинета — по желанию) */
  showDelivery?: boolean;
};

export function OrderDetails({ order, showDelivery = true }: Props) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Статус</dt>
          <dd data-testid="order-status" data-status={order.status}>
            {orderStatusLabel(order.status)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Дата</dt>
          <dd>{new Date(order.createdAt).toLocaleString("ru-RU")}</dd>
        </div>
        {showDelivery ? (
          <>
            <div>
              <dt className="text-muted">Получение</dt>
              <dd data-testid="order-delivery-type">
                {order.deliveryType === "delivery" ? "Доставка" : "Самовывоз"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Контакты</dt>
              <dd>
                {order.recipientName}, {order.phone}
              </dd>
            </div>
            {order.deliveryType === "delivery" && order.address ? (
              <div className="sm:col-span-2">
                <dt className="text-muted">Адрес</dt>
                <dd data-testid="order-address">{order.address}</dd>
              </div>
            ) : null}
          </>
        ) : null}
      </dl>

      <ul className="space-y-3" data-testid="order-items">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-baseline justify-between gap-2 border border-border bg-bg px-3 py-2 text-sm"
            data-testid="order-item"
          >
            <div>
              <p className="font-medium">{item.titleSnapshot}</p>
              <p className="mt-1 font-mono text-muted">
                {formatPrice(item.priceSnapshot)} × {item.quantity}
              </p>
            </div>
            <p className="font-mono text-accent">{formatPrice(item.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <p className="text-right font-mono text-xl text-accent" data-testid="order-total">
        {formatPrice(order.total)}
      </p>
    </div>
  );
}
