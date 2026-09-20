import { DeliveryType, OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getOrCreateCart } from "@/server/services/cart";
import { createOrderBodySchema } from "@/shared/api-contract";
import { toMoney } from "@/shared/money";
import type { Order as ContractOrder } from "@/shared/api-contract";

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

export class OrderError extends Error {
  constructor(
    public code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export async function createOrder(userId: string, input: CreateOrderInput): Promise<SerializedOrder> {
  const data = createOrderSchema.parse(input);

  if (data.deliveryType === "PICKUP" && data.pickupPointId) {
    const point = await prisma.pickupPoint.findUnique({ where: { id: data.pickupPointId } });
    if (!point) {
      throw new OrderError("VALIDATION_ERROR", "Пункт самовывоза не найден");
    }
  }

  const cart = await getOrCreateCart(userId);
  if (cart.items.length === 0) {
    throw new OrderError("VALIDATION_ERROR", "Корзина пуста");
  }

  const order = await prisma.$transaction(
    async (tx) => {
      const productIds = cart.items.map((item) => item.productId);
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

      for (const item of cart.items) {
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
        lines.map((line) =>
          tx.product.update({
            where: { id: line.productId },
            data: { stock: { decrement: line.quantity } },
          }),
        ),
      );

      const created = await tx.order.create({
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

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
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
