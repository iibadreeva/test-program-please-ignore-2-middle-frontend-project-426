import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  finishNavigationProgress,
  startNavigationProgress,
} from "@/shared/navigation-progress-store";
import {
  NavigationProgress,
  SAFETY_TIMEOUT_MS,
  SHOW_DELAY_MS,
} from "@/components/navigation-progress";

const pathnameRef = { current: "/" };
const searchRef = { current: "" };

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.current,
  useSearchParams: () => new URLSearchParams(searchRef.current),
}));

describe("NavigationProgress", () => {
  beforeEach(() => {
    pathnameRef.current = "/";
    searchRef.current = "";
    finishNavigationProgress();
    vi.useFakeTimers();
  });

  afterEach(() => {
    finishNavigationProgress();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("показывает полосу после задержки SHOW_DELAY при старте перехода", () => {
    render(<NavigationProgress />);
    expect(screen.queryByTestId("navigation-progress")).toBeNull();

    act(() => {
      startNavigationProgress();
    });
    expect(screen.queryByTestId("navigation-progress")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });
    expect(screen.getByTestId("navigation-progress")).toBeTruthy();
    expect(screen.getByTestId("navigation-progress").getAttribute("aria-busy")).toBe("true");
    expect(
      screen.getByTestId("navigation-progress").querySelector(".nav-progress-bar"),
    ).toBeTruthy();
  });

  it("скрывает полосу при смене pathname", () => {
    const { rerender } = render(<NavigationProgress />);

    act(() => {
      startNavigationProgress();
    });
    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });
    expect(screen.getByTestId("navigation-progress")).toBeTruthy();

    pathnameRef.current = "/catalog";
    act(() => {
      rerender(<NavigationProgress />);
    });

    expect(screen.queryByTestId("navigation-progress")).toBeNull();
  });

  it("снимает navigating по safety timeout", () => {
    render(<NavigationProgress />);

    act(() => {
      startNavigationProgress();
    });
    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });
    expect(screen.getByTestId("navigation-progress")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(SAFETY_TIMEOUT_MS);
    });
    expect(screen.queryByTestId("navigation-progress")).toBeNull();
  });

  it("перезапускает safety timeout при новом href", () => {
    render(<NavigationProgress />);

    act(() => {
      startNavigationProgress("/catalog");
    });
    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });
    expect(screen.getByTestId("navigation-progress")).toBeTruthy();

    // Safety стартовал вместе с show: осталось SAFETY - SHOW_DELAY.
    act(() => {
      vi.advanceTimersByTime(SAFETY_TIMEOUT_MS - SHOW_DELAY_MS - 50);
    });
    expect(screen.getByTestId("navigation-progress")).toBeTruthy();

    act(() => {
      startNavigationProgress("/cart");
    });
    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS);
    });
    expect(screen.getByTestId("navigation-progress")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(SAFETY_TIMEOUT_MS - SHOW_DELAY_MS - 50);
    });
    expect(screen.getByTestId("navigation-progress")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.queryByTestId("navigation-progress")).toBeNull();
  });
});
