import { describe, expect, it } from "vitest";
import { formatMoney, fromMoney, toMoney } from "@/shared/money";

describe("formatMoney", () => {
  it("formats integer rubles for display", () => {
    expect(formatMoney(68990)).toMatch(/68[\s\u00a0]?990/);
    expect(formatMoney("68990")).toMatch(/₽|RUB|руб/i);
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toMatch(/0/);
    expect(formatMoney("0")).toMatch(/0/);
  });
});

describe("money helpers", () => {
  it("round-trips integer rubles", () => {
    expect(fromMoney(toMoney(16990))).toBe(16990);
  });

  it("rejects invalid money strings", () => {
    expect(() => fromMoney("12.5")).toThrow();
    expect(() => fromMoney("-1")).toThrow();
    expect(() => fromMoney("0123")).toThrow();
    expect(() => fromMoney("")).toThrow();
  });
});
