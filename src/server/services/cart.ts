import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { clearCartIdCookie, getCartIdFromCookie, setCartIdCookie } from "@/server/cart-cookie";
import { serializeProductSummary } from "@/server/services/catalog";

const cartInclude = {
  items: {
    include: {
      product: {
        include: {
          category: true,
          brand: true,
        },
      },
    },
    orderBy: { id: "asc" as const },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export function serializeCart(cart: CartWithItems) {
  const items = cart.items.map((item) => {
    const product = serializeProductSummary(item.product);
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product,
      lineTotalCents: product.priceCents * item.quantity,
    };
  });

  return {
    id: cart.id,
    items,
    totalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export type SerializedCart = ReturnType<typeof serializeCart>;

async function loadCart(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: cartInclude,
  });
}

function emptyCartView(id = "empty"): SerializedCart {
  return { id, items: [], totalCents: 0, itemsCount: 0 };
}

/** Read-only: never creates a cart or writes cookies (safe in RSC). */
export async function getCartView(userId?: string | null): Promise<SerializedCart> {
  if (userId) {
    const existing = await prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });
    return existing ? serializeCart(existing) : emptyCartView();
  }

  const cookieCartId = await getCartIdFromCookie();
  if (!cookieCartId) return emptyCartView();

  const existing = await loadCart(cookieCartId);
  if (!existing || existing.userId) return emptyCartView();
  return serializeCart(existing);
}

/** Resolve current cart for mutations. Creates guest cart + cookie if needed. */
export async function getOrCreateCart(userId?: string | null) {
  if (userId) {
    const existing = await prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });
    if (existing) return existing;

    return prisma.cart.create({
      data: { userId },
      include: cartInclude,
    });
  }

  const cookieCartId = await getCartIdFromCookie();
  if (cookieCartId) {
    const existing = await loadCart(cookieCartId);
    if (existing && !existing.userId) return existing;
  }

  const created = await prisma.cart.create({
    data: {},
    include: cartInclude,
  });
  await setCartIdCookie(created.id);
  return created;
}

export async function addCartItem(
  productId: string,
  quantity = 1,
  userId?: string | null,
): Promise<SerializedCart> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new CartError("VALIDATION_ERROR", "Количество должно быть целым числом ≥ 1");
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new CartError("NOT_FOUND", "Товар не найден");
  }
  if (product.stock <= 0) {
    throw new CartError("VALIDATION_ERROR", "Товара нет в наличии");
  }

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((i) => i.productId === productId);
  const nextQty = (existing?.quantity ?? 0) + quantity;

  if (nextQty > product.stock) {
    throw new CartError("VALIDATION_ERROR", `Доступно только ${product.stock} шт.`);
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }

  const updated = await loadCart(cart.id);
  if (!updated) throw new CartError("NOT_FOUND", "Корзина не найдена");
  return serializeCart(updated);
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number,
  userId?: string | null,
): Promise<SerializedCart> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new CartError("VALIDATION_ERROR", "Количество должно быть целым числом ≥ 1");
  }

  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    throw new CartError("NOT_FOUND", "Позиция корзины не найдена");
  }
  if (quantity > item.product.stock) {
    throw new CartError("VALIDATION_ERROR", `Доступно только ${item.product.stock} шт.`);
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  const updated = await loadCart(cart.id);
  if (!updated) throw new CartError("NOT_FOUND", "Корзина не найдена");
  return serializeCart(updated);
}

export async function removeCartItem(
  itemId: string,
  userId?: string | null,
): Promise<SerializedCart> {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    throw new CartError("NOT_FOUND", "Позиция корзины не найдена");
  }

  await prisma.cartItem.delete({ where: { id: itemId } });

  const updated = await loadCart(cart.id);
  if (!updated) throw new CartError("NOT_FOUND", "Корзина не найдена");
  return serializeCart(updated);
}

export async function clearCart(userId?: string | null): Promise<void> {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  if (!userId) {
    // keep cookie pointing at empty cart
  }
}

/** Merge guest cookie cart into user cart after login/register. */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const guestCartId = await getCartIdFromCookie();
  if (!guestCartId) return;

  const guestCart = await prisma.cart.findUnique({
    where: { id: guestCartId },
    include: { items: true },
  });
  if (!guestCart || guestCart.userId) {
    await clearCartIdCookie();
    return;
  }

  const userCart = await getOrCreateCart(userId);

  for (const guestItem of guestCart.items) {
    const product = await prisma.product.findUnique({ where: { id: guestItem.productId } });
    if (!product || product.stock <= 0) continue;

    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: userCart.id, productId: guestItem.productId },
      },
    });

    const mergedQty = Math.min(
      product.stock,
      (existing?.quantity ?? 0) + guestItem.quantity,
    );

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: mergedQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: guestItem.productId,
          quantity: mergedQty,
        },
      });
    }
  }

  await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
  await prisma.cart.delete({ where: { id: guestCart.id } });
  await clearCartIdCookie();
}

export class CartError extends Error {
  constructor(
    public code: "VALIDATION_ERROR" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "CartError";
  }
}
