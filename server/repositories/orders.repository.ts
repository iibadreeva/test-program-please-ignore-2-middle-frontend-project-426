import "server-only";

import { DeliveryType, OrderStatus, type Prisma } from "@prisma/client";
import { prisma } from "@server/db";
import { orderInclude } from "@server/db/includes/order";

/**
 * Prisma-доступ к заказам и остаткам.
 * Инварианты checkout (агрегация, problems) — в domain/services;
 * атомарный decrement stock живёт здесь (единственный источник where/data).
 */

export type OrderTransaction = Prisma.TransactionClient;

export async function runOrderTransaction<T>(
  fn: (tx: OrderTransaction) => Promise<T>,
  options?: { timeout?: number; maxWait?: number },
): Promise<T> {
  return prisma.$transaction(fn, options);
}

export async function findProductsForOrder(
  tx: OrderTransaction,
  productIds: string[],
) {
  return tx.product.findMany({
    where: { id: { in: productIds } },
  });
}

/**
 * Prisma where/data для атомарного decrement остатка (не уходит в минус).
 * Единственный источник: createOrder идёт только через `decrementProductStock`.
 */
export function productStockDecrementArgs(productId: string, quantity: number) {
  return {
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  };
}

/** Атомарный decrement остатка: обновляет только если stock >= quantity. */
export async function decrementProductStock(
  tx: OrderTransaction,
  productId: string,
  quantity: number,
) {
  return tx.product.updateMany(productStockDecrementArgs(productId, quantity));
}

export async function findProductStock(tx: OrderTransaction, productId: string) {
  return tx.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  });
}

export type CreateOrderRecordInput = {
  userId: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  address: string | null;
  recipientName: string;
  phone: string;
  total: number;
  lines: Array<{
    productId: string;
    titleSnapshot: string;
    priceSnapshot: number;
    imageUrlSnapshot: string;
    quantity: number;
  }>;
};

export async function createOrderRecord(
  tx: OrderTransaction,
  data: CreateOrderRecordInput,
) {
  return tx.order.create({
    data: {
      userId: data.userId,
      status: data.status,
      deliveryType: data.deliveryType,
      address: data.address,
      recipientName: data.recipientName,
      phone: data.phone,
      total: data.total,
      items: {
        create: data.lines,
      },
    },
    include: orderInclude,
  });
}

export async function findOrdersByUserId(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function findOrderByIdForUser(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });
}
