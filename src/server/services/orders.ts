import "server-only";

import { DeliveryType, OrderStatus } from "@prisma/client";
import {
  aggregateOrderItems,
  buildOrderLines,
  collectOrderProblems,
  raceUnavailableProblem,
} from "@/server/domain/order-rules";
import {
  createOrderSchema,
  type CreateOrderInput,
} from "@/server/domain/order-schema";
import { OrderError, OrderItemsUnavailableError } from "@/server/errors";
import { log } from "@/server/observability/log";
import * as ordersRepository from "@/server/repositories/orders.repository";
import { serializeOrder, type SerializedOrder } from "@/server/serializers/order";

export { OrderError, OrderItemsUnavailableError } from "@/server/errors";
export {
  aggregateOrderItems,
  buildOrderLines,
  collectOrderProblems,
  raceUnavailableProblem,
} from "@/server/domain/order-rules";
export { createOrderSchema, type CreateOrderInput } from "@/server/domain/order-schema";
export { serializeOrder, type SerializedOrder } from "@/server/serializers/order";

const DELIVERY_TO_PRISMA: Record<"delivery" | "pickup", DeliveryType> = {
  delivery: DeliveryType.DELIVERY,
  pickup: DeliveryType.PICKUP,
};

export async function createOrder(
  userId: string,
  input: CreateOrderInput,
): Promise<SerializedOrder> {
  const data = createOrderSchema.parse(input);

  const items = aggregateOrderItems(data.items);
  if (items.length === 0) {
    throw new OrderError("VALIDATION_ERROR", "Корзина пуста");
  }

  try {
    const order = await ordersRepository.runOrderTransaction(
      async (tx) => {
        const productIds = items.map((item) => item.productId);
        const products = await ordersRepository.findProductsForOrder(tx, productIds);

        const problems = collectOrderProblems(items, products);
        if (problems.length > 0) {
          throw new OrderItemsUnavailableError(problems);
        }

        const { lines, total } = buildOrderLines(items, products);

        // Последовательно: Prisma не рекомендует Promise.all в interactive transaction.
        // При первой гонке сразу отказ — дальнейшие decrement не нужны (TX откатится).
        for (const line of lines) {
          const updated = await ordersRepository.decrementProductStock(
            tx,
            line.productId,
            line.quantity,
          );
          if (updated.count !== 1) {
            const current = await ordersRepository.findProductStock(tx, line.productId);
            throw new OrderItemsUnavailableError([
              raceUnavailableProblem(line, current?.stock ?? 0),
            ]);
          }
        }

        return ordersRepository.createOrderRecord(tx, {
          userId,
          status: OrderStatus.PAID,
          deliveryType: DELIVERY_TO_PRISMA[data.deliveryType],
          address: data.deliveryType === "delivery" ? (data.address ?? null) : null,
          recipientName: data.recipientName,
          phone: data.phone,
          total,
          lines,
        });
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    const serialized = serializeOrder(order);
    log.info("order.created", {
      userId,
      orderId: serialized.id,
      total: order.total,
      itemsCount: order.items.length,
    });
    return serialized;
  } catch (error) {
    if (error instanceof OrderItemsUnavailableError) {
      log.warn("order.stock_conflict", {
        userId,
        problemsCount: error.problems.length,
        productIds: error.problems.map((p) => p.productId).join(","),
        reasons: error.problems.map((p) => p.reason).join(","),
      });
    }
    throw error;
  }
}

export async function listOrders(userId: string): Promise<SerializedOrder[]> {
  const orders = await ordersRepository.findOrdersByUserId(userId);
  return orders.map(serializeOrder);
}

export async function getOrderById(userId: string, orderId: string): Promise<SerializedOrder | null> {
  const order = await ordersRepository.findOrderByIdForUser(userId, orderId);
  return order ? serializeOrder(order) : null;
}
