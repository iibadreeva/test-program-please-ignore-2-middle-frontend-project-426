"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { mapDomainErrorToActionResult } from "@/server/errors/map-to-action";
import { createOrder, createOrderSchema } from "@/server/services/orders";
import type { OrderProblemItem } from "@/shared/api-contract";
import { routes } from "@/shared/routes";

export type CheckoutFormState = {
  ok: boolean;
  orderId?: string;
  message?: string;
  problems?: OrderProblemItem[];
  fieldErrors?: Record<string, string[] | undefined>;
};

function parseItems(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function checkoutAction(
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  try {
    const user = await requireUser();
    const deliveryType = String(formData.get("deliveryType") ?? "delivery");

    const parsed = createOrderSchema.safeParse({
      deliveryType,
      address: String(formData.get("address") ?? "") || undefined,
      recipientName: String(formData.get("recipientName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      items: parseItems(formData.get("items")),
    });

    if (!parsed.success) {
      return mapDomainErrorToActionResult(parsed.error, "Не удалось оформить заказ");
    }

    const order = await createOrder(user.id, parsed.data);

    // Сброс data-cache витрины: остатки/availability после заказа.
    revalidateTag("catalog");
    revalidateTag("promos");
    revalidatePath(routes.cart);
    revalidatePath(routes.account);
    revalidatePath(routes.home);
    revalidatePath(routes.catalog);
    // PDP с revalidate=60: сбросить сегмент /products/* (не только home/catalog).
    revalidatePath(routes.products, "layout");

    // Клиент сам очистит корзину и перейдёт на success — не ждём redirect до очистки localStorage.
    return { ok: true, orderId: order.id };
  } catch (error) {
    return mapDomainErrorToActionResult(error, "Не удалось оформить заказ");
  }
}
