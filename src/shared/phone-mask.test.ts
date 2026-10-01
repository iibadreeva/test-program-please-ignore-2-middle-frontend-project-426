import { describe, expect, it } from "vitest";
import { applyPhoneMask, formatPhoneMask } from "@/shared/phone-mask";

describe("formatPhoneMask", () => {
  it("возвращает пустую строку для пустого ввода", () => {
    expect(formatPhoneMask("")).toBe("");
    expect(formatPhoneMask("+")).toBe("");
  });

  it("форматирует ввод с 9", () => {
    expect(formatPhoneMask("9")).toBe("+7 (9");
    expect(formatPhoneMask("999")).toBe("+7 (999");
    expect(formatPhoneMask("999123")).toBe("+7 (999) 123");
    expect(formatPhoneMask("9991234567")).toBe("+7 (999) 123-45-67");
  });

  it("форматирует ввод с 8 или 7 в начале", () => {
    expect(formatPhoneMask("89991234567")).toBe("+7 (999) 123-45-67");
    expect(formatPhoneMask("+79991234567")).toBe("+7 (999) 123-45-67");
    expect(formatPhoneMask("79991234567")).toBe("+7 (999) 123-45-67");
  });

  it("ограничивает количество цифр номером из 10 цифр после +7", () => {
    expect(formatPhoneMask("+7 (999) 123-45-678999")).toBe("+7 (999) 123-45-67");
  });
});

describe("applyPhoneMask", () => {
  it("ставит каретку в конец, если цифры дописаны в конец", () => {
    const result = applyPhoneMask("9991234567", 10);
    expect(result.value).toBe("+7 (999) 123-45-67");
    expect(result.selectionStart).toBe(result.value.length);
  });

  it("оставляет каретку после тех же цифр номера при вставке в середине", () => {
    expect(applyPhoneMask("+7 (99499) 123-45-67", 7)).toEqual({
      value: "+7 (994) 991-23-45",
      selectionStart: 7,
    });
  });

  it("после удаления первой цифры номера каретка остаётся перед оставшимися цифрами", () => {
    expect(applyPhoneMask("+7 (99) 123-45-67", 4)).toEqual({
      value: "+7 (991) 234-56-7",
      selectionStart: 3,
    });
  });

  it("для пустого ввода каретка в начале", () => {
    expect(applyPhoneMask("+", 1)).toEqual({ value: "", selectionStart: 0 });
  });
});
