import { z } from "zod";
import { createOrderBodySchema } from "@/shared/api-contract";

/** Максимальная длина адреса доставки (символы после trim). */
export const MAX_ADDRESS_LENGTH = 500;

/** Минимальная длина адреса доставки (символы после trim). */
export const MIN_ADDRESS_LENGTH = 5;

/** Минимум цифр национального номера после отбрасывания ведущей 7 или 8. */
const MIN_NATIONAL_PHONE_DIGITS = 10;

export const checkoutFieldNames = ["deliveryType", "address", "recipientName", "phone"] as const;

export type CheckoutFieldName = (typeof checkoutFieldNames)[number];

/** Ошибки полей checkout: первое сообщение в массиве, как `fieldErrors` формы. */
export type CheckoutFieldErrors = Partial<Record<CheckoutFieldName, string[]>>;

function isCheckoutFieldName(key: unknown): key is CheckoutFieldName {
  return checkoutFieldNames.some((name) => name === key);
}

/** Как в маске: ведущая 7/8 — код страны, дальше нужны 10 цифр номера. */
function nationalPhoneDigitCount(value: string): number {
  let digits = "";
  for (const char of value) {
    if (char >= "0" && char <= "9") digits += char;
  }
  if (digits.startsWith("7") || digits.startsWith("8")) {
    digits = digits.slice(1);
  }
  return digits.length;
}

export const checkoutRecipientNameSchema = z
  .string()
  .trim()
  .min(2, "Укажите имя получателя")
  .max(80);

export const checkoutPhoneSchema = z
  .string()
  .trim()
  .min(10, "Укажите телефон")
  .max(20)
  .regex(/^[+\d\s()-]+$/, "Некорректный телефон")
  .refine(
    (value) => nationalPhoneDigitCount(value) >= MIN_NATIONAL_PHONE_DIGITS,
    "Некорректный телефон",
  );

export const checkoutAddressSchema = z.string().trim().max(MAX_ADDRESS_LENGTH).optional();

/** Адрес обязателен только при доставке — общий refine для клиента и сервера. */
export function refineDeliveryAddress(
  data: { deliveryType: "delivery" | "pickup"; address?: string },
  ctx: z.RefinementCtx,
) {
  if (data.deliveryType === "delivery") {
    if (!data.address || data.address.length < MIN_ADDRESS_LENGTH) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Укажите адрес доставки",
      });
    }
  }
}

/**
 * Правила полей checkout без items — для клиентской валидации
 * и расширения createOrderSchema на сервере.
 */
export const checkoutFieldsSchema = z
  .object({
    deliveryType: createOrderBodySchema.shape.deliveryType,
    address: checkoutAddressSchema,
    recipientName: checkoutRecipientNameSchema,
    phone: checkoutPhoneSchema,
  })
  .superRefine(refineDeliveryAddress);

export type CheckoutFields = z.infer<typeof checkoutFieldsSchema>;

/** Первое сообщение по каждому полю в виде `string[]`, как `fieldErrors` формы. */
export function validateCheckoutFields(values: {
  deliveryType: string;
  address?: string;
  recipientName: string;
  phone: string;
}): CheckoutFieldErrors {
  const result = checkoutFieldsSchema.safeParse({
    deliveryType: values.deliveryType,
    address: values.address || undefined,
    recipientName: values.recipientName,
    phone: values.phone,
  });

  if (result.success) return {};

  const out: CheckoutFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (isCheckoutFieldName(key) && out[key] === undefined) {
      out[key] = [issue.message];
    }
  }
  return out;
}
