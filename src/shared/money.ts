import type { MoneyString } from "@/shared/api-contract";

const MONEY_PATTERN = /^(0|[1-9][0-9]*)$/;

/** Convert DB integer rubles → API Money string. */
export function toMoney(value: number): MoneyString {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid money amount: ${value}`);
  }
  return String(value);
}

/** Parse API Money string → integer rubles for arithmetic. */
export function fromMoney(value: string): number {
  if (!MONEY_PATTERN.test(value)) {
    throw new Error(`Invalid money string: ${value}`);
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) {
    throw new Error(`Money string exceeds safe integer range: ${value}`);
  }
  return amount;
}

export function formatMoney(value: string | number, locale = "ru-RU"): string {
  const amount = typeof value === "number" ? value : fromMoney(value);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}
