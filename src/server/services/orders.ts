import { DeliveryType, OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import { createOrderBodySchema } from "@/shared/api-contract";
import { toMoney } from "@/shared/money";
import type { Order as ContractOrder } from "@/shared/api-contract";
import { MAX_CART_IDS, MAX_CART_LINE_QTY } from "@/shared/constants";

export const createOrderSchema = createOrderBodySchema
  .extend({
    address: z.string().trim().optional(),
    recipientName: z.string().trim().min(2, "Укажите имя получателя").max(80),
    phone: z
      .string()
      .trim()
      .min(10, "Укажите телефон")
      .max(20)
      .regex(/^[+\d\s()-]+$/, "Некорректный телефон"),
    comment: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryType === "DELIVERY") {
      if (!data.address || data.address.length < 5) {
        ctx.addIssue({
          code: "custom",
          path: ["address"],
          message: "Укажите адрес доставки",
        });
      }
    }
    if (data.deliveryType === "PICKUP") {
      if (!data.pickupPointId) {
        ctx.addIssue({
          code: "custom",
          path: ["pickupPointId"],
          message: "Выберите пункт самовывоза",
        });
      }
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export type OrderLineInput = { productId: string; quantity: number };

export class OrderError extends Error {
  constructor(
    public code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

/** Схлопнуть дубли productId, чтобы нельзя было обойти проверку остатка. */
export function aggregateOrderItems(items: OrderLineInput[]): OrderLineInput[] {
  const byId = new Map<string, number>();
  for (const item of items) {
    byId.set(item.productId, (byId.get(item.productId) ?? 0) + item.quantity);
  }
  if (byId.size > MAX_CART_IDS) {
    throw new OrderError(
      "VALIDATION_ERROR",
      `В заказе не больше ${MAX_CART_IDS} позиций`,
    );
  }
  return [...byId.entries()].map(([productId, quantity]) => ({
    productId,
    quantity: Math.min(quantity, MAX_CART_LINE_QTY),
  }));
}

/** Аргументы Prisma для атомарного decrement остатка, который не уходит в минус. */
export function stockDecrementArgs(productId: string, quantity: number) {
  return {
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  };
}

const orderInclude = {
  items: { orderBy: { id: "asc" as const } },
  pickupPoint: true,
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export type SerializedOrder = ContractOrder;

export function serializeOrder(order: OrderWithRelations): SerializedOrder {
  return {
    id: order.id,
    status: order.status,
    deliveryType: order.deliveryType,
    address: order.address ?? undefined,
    pickupPointId: order.pickupPointId ?? undefined,
    pickupPoint: order.pickupPoint
      ? {
          id: order.pickupPoint.id,
          name: order.pickupPoint.name,
          address: order.pickupPoint.address,
        }
      : null,
    recipientName: order.recipientName,
    phone: order.phone,
    comment: order.comment ?? undefined,
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

export async function createOrder(userId: string, input: CreateOrderInput): Promise<SerializedOrder> {
  const data = createOrderSchema.parse(input);

  if (data.deliveryType === "PICKUP" && data.pickupPointId) {
    const point = await prisma.pickupPoint.findUnique({ where: { id: data.pickupPointId } });
    if (!point) {
      throw new OrderError("VALIDATION_ERROR", "Пункт самовывоза не найден");
    }
  }

  const items = aggregateOrderItems(data.items);
  if (items.length === 0) {
    throw new OrderError("VALIDATION_ERROR", "Корзина пуста");
  }

  const order = await prisma.$transaction(
    async (tx) => {
      const productIds = items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const byId = new Map(products.map((product) => [product.id, product]));

      const lines: {
        productId: string;
        titleSnapshot: string;
        priceSnapshot: number;
        imageUrlSnapshot: string;
        quantity: number;
      }[] = [];

      let total = 0;

      for (const item of items) {
        const product = byId.get(item.productId);
        if (!product) {
          throw new OrderError("CONFLICT", `Товар недоступен: ${item.productId}`);
        }
        if (product.stock < item.quantity) {
          throw new OrderError(
            "CONFLICT",
            `Недостаточно «${product.title}»: в наличии ${product.stock} шт.`,
          );
        }

        lines.push({
          productId: product.id,
          titleSnapshot: product.title,
          priceSnapshot: product.price,
          imageUrlSnapshot: product.imageUrl ?? "",
          quantity: item.quantity,
        });
        total += product.price * item.quantity;
      }

      await Promise.all(
        lines.map(async (line) => {
          const updated = await tx.product.updateMany(stockDecrementArgs(line.productId, line.quantity));
          if (updated.count !== 1) {
            throw new OrderError(
              "CONFLICT",
              `Недостаточно «${line.titleSnapshot}»: товар уже разобрали.`,
            );
          }
        }),
      );

      return tx.order.create({
        data: {
          userId,
          status: OrderStatus.NEW,
          deliveryType: data.deliveryType as DeliveryType,
          address: data.deliveryType === "DELIVERY" ? data.address : null,
          pickupPointId: data.deliveryType === "PICKUP" ? data.pickupPointId : null,
          recipientName: data.recipientName,
          phone: data.phone,
          comment: data.comment || null,
          total,
          items: {
            create: lines,
          },
        },
        include: orderInclude,
      });
    },
    { timeout: 20_000, maxWait: 10_000 },
  );

  return serializeOrder(order);
}

export async function listOrders(userId: string): Promise<SerializedOrder[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(serializeOrder);
}

export async function getOrderById(userId: string, orderId: string): Promise<SerializedOrder | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });
  return order ? serializeOrder(order) : null;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новый",
  PROCESSING: "В обработке",
  SHIPPED: "Отправлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status as OrderStatus] ?? status;
}
