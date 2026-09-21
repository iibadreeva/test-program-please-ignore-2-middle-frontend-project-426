import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ClearCartOnPlaced } from "@/features/cart/clear-cart-on-placed";
import { wasCartClearedForOrder } from "@/features/cart/order-cart-clear";
import { useCartStore } from "@/features/cart/store";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("ClearCartOnPlaced", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    replace.mockReset();
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 2 }],
      hydrated: true,
    });
  });

  it("clears cart once for an order and strips ?placed from the URL", async () => {
    const { queryByTestId, unmount } = render(
      <ClearCartOnPlaced orderId="order-1" placed />,
    );

    await waitFor(() => {
      expect(useCartStore.getState().refs).toEqual([]);
      expect(wasCartClearedForOrder("order-1")).toBe(true);
      expect(replace).toHaveBeenCalledWith("/account/orders/order-1", { scroll: false });
    });
    expect(queryByTestId("order-placed-banner")).toBeTruthy();
    unmount();

    useCartStore.getState().add("prod-new", 1);
    replace.mockClear();

    const again = render(<ClearCartOnPlaced orderId="order-1" placed />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/account/orders/order-1", { scroll: false });
    });
    expect(useCartStore.getState().refs).toEqual([{ productId: "prod-new", quantity: 1 }]);
    expect(again.queryByTestId("order-placed-banner")).toBeTruthy();
  });

  it("does nothing when placed is false", async () => {
    render(<ClearCartOnPlaced orderId="order-1" placed={false} />);
    await waitFor(() => {
      expect(replace).not.toHaveBeenCalled();
    });
    expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 2 }]);
  });
});
