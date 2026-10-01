import { describe, expect, it } from "vitest";
import {
  DomainError,
  OrderItemsUnavailableError,
} from "@/server/errors";
import {
  classifyDomainError,
  fieldErrorsFromDetails,
} from "@/server/errors/classify";

describe("fieldErrorsFromDetails", () => {
  it("принимает Zod-совместимый fieldErrors (массивы строк и undefined)", () => {
    expect(
      fieldErrorsFromDetails({
        fieldErrors: {
          email: ["Некорректный email"],
          name: undefined,
        },
      }),
    ).toEqual({
      email: ["Некорректный email"],
      name: undefined,
    });
  });

  it("отклоняет fieldErrors со строковым значением вместо массива", () => {
    expect(
      fieldErrorsFromDetails({ fieldErrors: { email: "bad" } }),
    ).toBeUndefined();
  });

  it("отклоняет fieldErrors с не-строками в массиве", () => {
    expect(
      fieldErrorsFromDetails({ fieldErrors: { qty: [1, 2] } }),
    ).toBeUndefined();
  });

  it("отклоняет fieldErrors-массив вместо объекта", () => {
    expect(fieldErrorsFromDetails({ fieldErrors: ["x"] })).toBeUndefined();
  });

  it("без fieldErrors возвращает undefined", () => {
    expect(fieldErrorsFromDetails({ other: true })).toBeUndefined();
    expect(fieldErrorsFromDetails(null)).toBeUndefined();
  });
});

describe("classifyDomainError", () => {
  it("OrderItemsUnavailableError → order_items_unavailable", () => {
    const error = new OrderItemsUnavailableError([
      { productId: "p1", reason: "unavailable", requested: 1, available: 0 },
    ]);
    expect(classifyDomainError(error)).toEqual({
      kind: "order_items_unavailable",
      error,
    });
  });

  it("голый DomainError ORDER_ITEMS_UNAVAILABLE → domain_internal (нужен subclass с problems)", () => {
    const error = new DomainError("ORDER_ITEMS_UNAVAILABLE", "без problems");
    expect(classifyDomainError(error)).toEqual({
      kind: "domain_internal",
      error,
    });
  });
});
