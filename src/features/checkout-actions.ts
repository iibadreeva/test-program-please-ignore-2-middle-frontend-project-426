"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireUser } from "@/server/auth/session";
import {
  createOrder,
  createOrderSchema,
  OrderError,
  OrderItemsUnavailableError,
} from "@/server/services/orders";
import type { OrderProblemItem } from "@/shared/api-contract";

export type CheckoutFormState = {
  ok: boolean;
  orderId?: string;
  message?: string;
  problems?: OrderProblemItem[];
  fieldErrors?: Record<string, string[] | undefined>;
};

function fail(error: unknown): CheckoutFormState {
  if (error instanceof OrderItemsUnavailableError) {
    return { ok: false, message: error.message, problems: error.problems };
  }
  if (error instanceof OrderError) {
    return { ok: false, message: error.message };
  }
  if (error instanceof ZodError) {
    return {
      ok: false,
      message: "Проверьте поля формы",
      fieldErrors: error.flatten().fieldErrors,
    };
  }
  console.error(error);
  return { ok: false, message: "Не удалось оформить заказ" };
}

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
      return fail(parsed.error);
    }

    const order = await createOrder(user.id, parsed.data);

    revalidatePath("/cart");
    revalidatePath("/account");
    revalidatePath("/", "layout");

    // Клиент сам очистит корзину и перейдёт на success — не ждём redirect до очистки localStorage.
    return { ok: true, orderId: order.id };
  } catch (error) {
    return fail(error);
  }
}
