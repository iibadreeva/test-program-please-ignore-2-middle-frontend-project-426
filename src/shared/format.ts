import { formatMoney } from "@/shared/money";

/** @deprecated Prefer formatMoney — kept as alias for gradual migration. */
export function formatPrice(amount: string | number, locale = "ru-RU"): string {
  return formatMoney(amount, locale);
}
