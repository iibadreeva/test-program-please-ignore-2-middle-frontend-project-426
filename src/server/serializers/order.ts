import "server-only";

import { DeliveryType, OrderStatus } from "@prisma/client";
import type { OrderWithRelations } from "@/server/db/includes/order";
import { toMoney } from "@/shared/money";
import type { Order as ContractOrder } from "@/shared/api-contract";

export type SerializedOrder = ContractOrder;

const DELIVERY_TO_CONTRACT: Record<DeliveryType, "delivery" | "pickup"> = {
  DELIVERY: "delivery",
  PICKUP: "pickup",
};

const STATUS_TO_CONTRACT: Record<OrderStatus, "paid"> = {
  PAID: "paid",
};

export function serializeOrder(order: OrderWithRelations): SerializedOrder {
  return {
    id: order.id,
    status: STATUS_TO_CONTRACT[order.status],
    deliveryType: DELIVERY_TO_CONTRACT[order.deliveryType],
    address: order.address ?? undefined,
    recipientName: order.recipientName,
    phone: order.phone,
    total: toMoney(order.total),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId ?? undefined,
      titleSnapshot: item.titleSnapshot,
      priceSnapshot: toMoney(item.priceSnapshot),
      imageUrlSnapshot: item.imageUrlSnapshot,
      quantity: item.quantity,
      lineTotal: toMoney(item.priceSnapshot * item.quantity),
    })),
  };
}
