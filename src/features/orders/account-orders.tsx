"use client";

import { useState } from "react";
import type { Order } from "@/shared/api-contract";
import { formatMoney } from "@/shared/money";
import { OrderDetails } from "@/features/orders/order-details";
import { orderStatusLabel } from "@/shared/order-status";

type Props = {
  orders: Order[];
  /** Deep link /account?order=… или редирект с /account/orders/:id */
  openOrderId?: string;
};

type OrderItemProps = {
  order: Order;
  initiallyOpen: boolean;
};

/** Локальный open: deep link открывает заказ, пользователь может свернуть. */
function AccountOrderItem({ order, initiallyOpen }: OrderItemProps) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <details
      className="border border-border bg-surface open:border-accent"
      data-testid="account-order-item"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-mono text-sm text-muted">#{order.id.slice(-8)}</p>
          <p className="mt-1 text-sm">
            {new Date(order.createdAt).toLocaleString("ru-RU")} ·{" "}
            {orderStatusLabel(order.status)}
          </p>
        </div>
        <p className="font-mono text-accent">{formatMoney(order.total)}</p>
      </summary>
      <div className="border-t border-border px-4 py-4">
        <OrderDetails order={order} />
      </div>
    </details>
  );
}

export function AccountOrders({ orders, openOrderId }: Props) {
  if (orders.length === 0) {
    return (
      <p className="border border-border bg-surface p-6 text-muted" data-testid="account-orders-empty">
        Заказов пока нет.
      </p>
    );
  }

  return (
    <ul className="space-y-3" data-testid="account-orders">
      {orders.map((order) => (
        <li key={order.id}>
          <AccountOrderItem order={order} initiallyOpen={openOrderId === order.id} />
        </li>
      ))}
    </ul>
  );
}
