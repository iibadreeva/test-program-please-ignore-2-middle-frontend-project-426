import { DeliveryType, OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import { createOrderBodySchema, type OrderProblemItem } from "@/shared/api-contract";
import { toMoney } from "@/shared/money";
import type { Order as ContractOrder } from "@/shared/api-contract";
import { MAX_CART_IDS, MAX_CART_LINE_QTY } from "@/shared/constants";

/** Максимальная длина адреса доставки (символы после trim). */
const MAX_ADDRESS_LENGTH = 500;

export const createOrderSchema = createOrderBodySchema
  .extend({
    address: z.string().trim().max(MAX_ADDRESS_LENGTH).optional(),
    recipientName: z.string().trim().min(2, "Укажите имя получателя").max(80),
    phone: z
      .string()
      .trim()
      .min(10, "Укажите телефон")
      .max(20)
      .regex(/^[+\d\s()-]+$/, "Некорректный телефон"),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryType === "delivery") {
      if (!data.address || data.address.length < 5) {
        ctx.addIssue({
          code: "custom",
          path: ["address"],
          message: "Укажите адрес доставки",
        });
      }
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export type OrderLineInput = { productId: string; quantity: number };

/** Алиас контрактного типа — один источник правды для 409 details. */
export type OrderProblem = OrderProblemItem;

export type ProductForOrder = {
  id: string;
  title: string;
  price: number;
  imageUrl: string | null;
  stock: number;
};

export type BuiltOrderLine = {
  productId: string;
  titleSnapshot: string;
  priceSnapshot: number;
  imageUrlSnapshot: string;
  quantity: number;
};

export class OrderError extends Error {
  constructor(
    public code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

/** Атомарный отказ: перечень всех проблемных позиций, заказ не создаётся. */
export class OrderItemsUnavailableError extends OrderError {
  constructor(
    public problems: OrderProblem[],
    message = "Некоторые товары недоступны",
  ) {
    super("CONFLICT", message);
    this.name = "OrderItemsUnavailableError";
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

/**
 * Собрать все проблемные позиции: товар не найден или остатка не хватает.
 * Частичного оформления нет — вызывающий отклоняет заказ целиком.
 */
export function collectOrderProblems(
  items: OrderLineInput[],
  products: ProductForOrder[],
): OrderProblem[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const problems: OrderProblem[] = [];

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      problems.push({
        productId: item.productId,
        reason: "not_found",
        requested: item.quantity,
        available: 0,
      });
      continue;
    }
    if (product.stock < item.quantity) {
      problems.push({
        productId: product.id,
        title: product.title,
        reason: "unavailable",
        requested: item.quantity,
        available: product.stock,
      });
    }
  }

  return problems;
}

/** Построить снимок позиций и итог по текущим ценам каталога (без цен клиента). */
export function buildOrderLines(
  items: OrderLineInput[],
  products: ProductForOrder[],
): { lines: BuiltOrderLine[]; total: number } {
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines: BuiltOrderLine[] = [];
  let total = 0;

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      throw new OrderError("CONFLICT", `Товар недоступен: ${item.productId}`);
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

  return { lines, total };
}

/** Проблема гонки остатка: available — фактический stock после неудачного decrement. */
export function raceUnavailableProblem(
  line: BuiltOrderLine,
  available: number,
): OrderProblem {
  return {
    productId: line.productId,
    title: line.titleSnapshot,
    reason: "unavailable",
    requested: line.quantity,
    available,
  };
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
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export type SerializedOrder = ContractOrder;

const DELIVERY_TO_PRISMA: Record<"delivery" | "pickup", DeliveryType> = {
  delivery: DeliveryType.DELIVERY,
  pickup: DeliveryType.PICKUP,
};

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

export async function createOrder(userId: string, input: CreateOrderInput): Promise<SerializedOrder> {
  const data = createOrderSchema.parse(input);

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

      const problems = collectOrderProblems(items, products);
      if (problems.length > 0) {
        throw new OrderItemsUnavailableError(problems);
      }

      const { lines, total } = buildOrderLines(items, products);

      // Последовательно: Prisma не рекомендует Promise.all в interactive transaction.
      // При первой гонке сразу отказ — дальнейшие decrement не нужны (TX откатится).
      for (const line of lines) {
        const updated = await tx.product.updateMany(
          stockDecrementArgs(line.productId, line.quantity),
        );
        if (updated.count !== 1) {
          const current = await tx.product.findUnique({
            where: { id: line.productId },
            select: { stock: true },
          });
          throw new OrderItemsUnavailableError([
            raceUnavailableProblem(line, current?.stock ?? 0),
          ]);
        }
      }

      return tx.order.create({
        data: {
          userId,
          status: OrderStatus.PAID,
          deliveryType: DELIVERY_TO_PRISMA[data.deliveryType],
          address: data.deliveryType === "delivery" ? data.address : null,
          recipientName: data.recipientName,
          phone: data.phone,
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
