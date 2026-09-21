"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireUser } from "@/server/auth/session";
import { createOrder, createOrderSchema, OrderError } from "@/server/services/orders";

export type CheckoutFormState = {
  ok: boolean;
  orderId?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function fail(error: unknown): CheckoutFormState {
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
    const deliveryType = String(formData.get("deliveryType") ?? "DELIVERY");

    const parsed = createOrderSchema.safeParse({
      deliveryType,
      address: String(formData.get("address") ?? "") || undefined,
      pickupPointId: String(formData.get("pickupPointId") ?? "") || undefined,
      recipientName: String(formData.get("recipientName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      comment: String(formData.get("comment") ?? "") || undefined,
      items: parseItems(formData.get("items")),
    });

    if (!parsed.success) {
      return fail(parsed.error);
    }

    const order = await createOrder(user.id, parsed.data);

    revalidatePath("/cart");
    revalidatePath("/account");
    revalidatePath("/account/orders");
    revalidatePath("/", "layout");

    // Клиент сам очистит корзину и перейдёт на заказ — не ждём redirect до очистки localStorage.
    return { ok: true, orderId: order.id };
  } catch (error) {
    return fail(error);
  }
}
