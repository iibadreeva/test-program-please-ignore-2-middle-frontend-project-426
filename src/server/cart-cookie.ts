import { cookies } from "next/headers";
import { CART_COOKIE, CART_COOKIE_MAX_AGE } from "@/shared/constants";

export async function getCartIdFromCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value;
}

export async function setCartIdCookie(cartId: string): Promise<void> {
  const jar = await cookies();
  jar.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

export async function clearCartIdCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(CART_COOKIE);
}
