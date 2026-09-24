import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { useCartStore } from "@/features/cart/store";

describe("AddToCartButton", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ refs: [], hydrated: true });
  });

  it("adds an available product to the cart store", () => {
    render(<AddToCartButton productId="prod-1" available />);

    fireEvent.click(screen.getByTestId("product-add-to-cart"));

    expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 1 }]);
    expect(screen.getByTestId("add-to-cart-success")).toBeTruthy();
  });

  it("does not add an unavailable product", () => {
    render(<AddToCartButton productId="prod-1" available={false} />);

    const button = screen.getByTestId("product-add-to-cart");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);

    expect(useCartStore.getState().refs).toEqual([]);
  });

  it("disabled until cart store is hydrated", () => {
    useCartStore.setState({ hydrated: false });
    render(<AddToCartButton productId="prod-1" available />);

    const button = screen.getByTestId("product-add-to-cart");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(useCartStore.getState().refs).toEqual([]);
  });
});
