import "server-only";

import { OrderError } from "@server/errors";
import type { OrderProblemItem } from "@/shared/api-contract";
import { MAX_CART_IDS, MAX_CART_LINE_QTY } from "@/shared/constants";

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
  return [...byId.entries()].map(([productId, quantity]) => {
    // Не клампим молча: иначе клиент думает, что заказал больше, чем оформили.
    if (quantity > MAX_CART_LINE_QTY) {
      throw new OrderError(
        "VALIDATION_ERROR",
        `Количество товара не больше ${MAX_CART_LINE_QTY}`,
      );
    }
    return { productId, quantity };
  });
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
