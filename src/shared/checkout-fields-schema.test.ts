import { describe, expect, it } from "vitest";
import { checkoutFieldsSchema, validateCheckoutFields } from "@/shared/checkout-fields-schema";

const base = {
  deliveryType: "delivery" as const,
  recipientName: "Иван",
  phone: "+79990001122",
};

describe("checkoutFieldsSchema", () => {
  it("требует адрес при delivery", () => {
    const result = checkoutFieldsSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it("не требует адрес при pickup", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      deliveryType: "pickup",
    });
    expect(result.success).toBe(true);
  });

  it("принимает валидную доставку", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет короткое имя", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
      recipientName: "А",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет некорректный телефон", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
      phone: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет маску, в которой меньше 10 цифр номера", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
      phone: "+7 (999) 123-45-6",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneIssue = result.error.issues.find((issue) => issue.path[0] === "phone");
      expect(phoneIssue?.message).toBe("Некорректный телефон");
    }
  });

  it("принимает полную маску +7 (XXX) XXX-XX-XX", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
      phone: "+7 (999) 123-45-67",
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет телефон из знаков без цифр", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
      phone: "((((((((((",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneIssue = result.error.issues.find((issue) => issue.path[0] === "phone");
      expect(phoneIssue?.message).toBe("Некорректный телефон");
    }
  });

  it("отклоняет адрес короче минимума и адрес из пробелов", () => {
    const short = checkoutFieldsSchema.safeParse({
      ...base,
      address: "я".repeat(4),
    });
    expect(short.success).toBe(false);

    const spaces = checkoutFieldsSchema.safeParse({
      ...base,
      address: "   ",
    });
    expect(spaces.success).toBe(false);

    const exact = checkoutFieldsSchema.safeParse({
      ...base,
      address: "я".repeat(5),
    });
    expect(exact.success).toBe(true);
  });

  it("отклоняет имя длиннее 80 и телефон длиннее 20", () => {
    const longName = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
      recipientName: "а".repeat(81),
    });
    expect(longName.success).toBe(false);

    const longPhone = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
      phone: "1".repeat(21),
    });
    expect(longPhone.success).toBe(false);
  });

  it("принимает имя из 80 символов и телефон из 20 цифр", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
      recipientName: "а".repeat(80),
      phone: "1".repeat(20),
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет неизвестный способ получения", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      address: "Москва, Тверская 1",
      deliveryType: "courier",
    });
    expect(result.success).toBe(false);
  });

  it("trim-ит пробелы у имени и телефона", () => {
    const result = checkoutFieldsSchema.safeParse({
      ...base,
      address: "  Москва, Тверская 1  ",
      recipientName: "  Иван  ",
      phone: "  +79990001122  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipientName).toBe("Иван");
      expect(result.data.phone).toBe("+79990001122");
      expect(result.data.address).toBe("Москва, Тверская 1");
    }
  });
});

describe("validateCheckoutFields", () => {
  it("возвращает первое сообщение по каждому полю", () => {
    const errors = validateCheckoutFields({
      deliveryType: "delivery",
      recipientName: "",
      phone: "",
      address: "",
    });
    expect(errors.recipientName).toEqual(["Укажите имя получателя"]);
    expect(errors.phone).toEqual(["Укажите телефон"]);
    expect(errors.address).toEqual(["Укажите адрес доставки"]);
  });

  it("кладёт сообщение неизвестного способа в deliveryType", () => {
    const errors = validateCheckoutFields({
      deliveryType: "courier",
      recipientName: "Иван",
      phone: "+79990001122",
      address: "Москва, Тверская 1",
    });
    expect(errors.deliveryType?.[0]).toBeTruthy();
    expect(errors.recipientName).toBeUndefined();
  });

  it("не возвращает address при pickup", () => {
    const errors = validateCheckoutFields({
      deliveryType: "pickup",
      recipientName: "Иван",
      phone: "+79990001122",
    });
    expect(errors.address).toBeUndefined();
    expect(errors.recipientName).toBeUndefined();
    expect(errors.phone).toBeUndefined();
  });
});
