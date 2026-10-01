import { fromMoney, toMoney } from "@/shared/money";
import type { MoneyString, ProductSummary } from "@/shared/api-contract";
import { MAX_CART_IDS, MAX_CART_LINE_QTY } from "@/shared/constants";

export const CART_STORAGE_KEY = "hexparts.cart.v1";

export type CartRef = {
  productId: string;
  quantity: number;
};

export type CartLine = {
  productId: string;
  quantity: number;
  product: ProductSummary;
  lineTotal: MoneyString;
};

export type MergedCart = {
  lines: CartLine[];
  broken: CartRef[];
  total: MoneyString;
  itemsCount: number;
};

function isCartRef(value: unknown): value is CartRef {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { productId?: unknown; quantity?: unknown };
  return (
    typeof candidate.productId === "string" &&
    candidate.productId.length > 0 &&
    typeof candidate.quantity === "number" &&
    Number.isInteger(candidate.quantity) &&
    candidate.quantity >= 1 &&
    candidate.quantity <= MAX_CART_LINE_QTY
  );
}

/** Отбросить мусор из localStorage и оставить последнее количество на productId. */
export function normalizeRefs(raw: unknown): CartRef[] {
  if (!Array.isArray(raw)) return [];

  const byId = new Map<string, number>();
  for (const entry of raw) {
    if (!isCartRef(entry)) continue;
    byId.set(entry.productId, entry.quantity);
  }

  return [...byId.entries()]
    .slice(0, MAX_CART_IDS)
    .map(([productId, quantity]) => ({ productId, quantity }));
}

export function addRef(refs: CartRef[], productId: string, quantity = 1): CartRef[] {
  if (!productId || !Number.isInteger(quantity) || quantity < 1) return refs;
  const existing = refs.find((ref) => ref.productId === productId);
  if (!existing) {
    if (refs.length >= MAX_CART_IDS) return refs;
    return [...refs, { productId, quantity: Math.min(quantity, MAX_CART_LINE_QTY) }];
  }
  return refs.map((ref) =>
    ref.productId === productId
      ? { ...ref, quantity: Math.min(ref.quantity + quantity, MAX_CART_LINE_QTY) }
      : ref,
  );
}

export function setRefQuantity(refs: CartRef[], productId: string, quantity: number): CartRef[] {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return removeRef(refs, productId);
  }
  const capped = Math.min(quantity, MAX_CART_LINE_QTY);
  return refs.map((ref) => (ref.productId === productId ? { ...ref, quantity: capped } : ref));
}

export function removeRef(refs: CartRef[], productId: string): CartRef[] {
  return refs.filter((ref) => ref.productId !== productId);
}

/**
 * Склеить refs корзины со свежими данными каталога. Отсутствующие или недоступные
 * товары попадают в `broken`, чтобы UI убрал их, не считая обычными позициями.
 */
export function mergeWithProducts(refs: CartRef[], products: ProductSummary[]): MergedCart {
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines: CartLine[] = [];
  const broken: CartRef[] = [];

  for (const ref of refs) {
    const product = byId.get(ref.productId);
    if (!product || !product.available) {
      broken.push(ref);
      continue;
    }
    const quantity = Math.min(ref.quantity, Math.max(1, product.stock), MAX_CART_LINE_QTY);
    lines.push({
      productId: ref.productId,
      quantity,
      product,
      lineTotal: toMoney(fromMoney(product.price) * quantity),
    });
  }

  return {
    lines,
    broken,
    total: toMoney(lines.reduce((sum, line) => sum + fromMoney(line.lineTotal), 0)),
    itemsCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

/**
 * Ограничить количество остатком и выкинуть отсутствующие/недоступные refs,
 * чтобы бейдж совпадал с тем, что реально можно заказать после загрузки каталога.
 */
export function clampedRefs(refs: CartRef[], products: ProductSummary[]): CartRef[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const next: CartRef[] = [];
  for (const ref of refs) {
    const product = byId.get(ref.productId);
    if (!product || !product.available) continue;
    const quantity = Math.min(ref.quantity, Math.max(1, product.stock), MAX_CART_LINE_QTY);
    next.push(quantity === ref.quantity ? ref : { productId: ref.productId, quantity });
  }
  return next;
}
