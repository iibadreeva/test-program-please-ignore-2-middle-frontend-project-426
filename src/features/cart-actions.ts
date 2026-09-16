"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/session";
import {
  addCartItem,
  CartError,
  clearCart,
  getCartView,
  removeCartItem,
  updateCartItemQuantity,
  type SerializedCart,
} from "@/server/services/cart";

export type CartActionResult =
  | { ok: true; cart: SerializedCart }
  | { ok: false; message: string };

function fail(error: unknown): CartActionResult {
  if (error instanceof CartError) {
    return { ok: false, message: error.message };
  }
  console.error(error);
  return { ok: false, message: "Не удалось обновить корзину" };
}

function revalidateCartPaths() {
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  revalidatePath("/products", "layout");
  revalidatePath("/catalog");
  revalidatePath("/checkout");
}

async function userId() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function addToCartAction(
  productId: string,
  quantity = 1,
): Promise<CartActionResult> {
  try {
    const uid = await userId();
    const cart = await addCartItem(productId, quantity, uid);
    revalidateCartPaths();
    return { ok: true, cart };
  } catch (error) {
    return fail(error);
  }
}

export async function updateCartItemAction(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    const uid = await userId();
    const cart = await updateCartItemQuantity(itemId, quantity, uid);
    revalidateCartPaths();
    return { ok: true, cart };
  } catch (error) {
    return fail(error);
  }
}

export async function removeCartItemAction(itemId: string): Promise<CartActionResult> {
  try {
    const uid = await userId();
    const cart = await removeCartItem(itemId, uid);
    revalidateCartPaths();
    return { ok: true, cart };
  } catch (error) {
    return fail(error);
  }
}

export async function clearCartAction(): Promise<CartActionResult> {
  try {
    const uid = await userId();
    await clearCart(uid);
    const cart = await getCartView(uid);
    revalidateCartPaths();
    return { ok: true, cart };
  } catch (error) {
    return fail(error);
  }
}
