import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  finishNavigationProgress,
  getNavigationProgressSnapshot,
  installNavigationProgressBridge,
  isSameDocumentUrl,
  startNavigationProgress,
  subscribeNavigationProgress,
} from "@/shared/navigation-progress-store";

describe("navigation-progress-store", () => {
  beforeEach(() => {
    finishNavigationProgress();
  });

  afterEach(() => {
    finishNavigationProgress();
    vi.unstubAllGlobals();
  });

  it("стартует и завершает переход с уведомлением подписчиков", () => {
    const seen: number[] = [];
    const unsubscribe = subscribeNavigationProgress(() => {
      seen.push(getNavigationProgressSnapshot());
    });

    startNavigationProgress();
    expect(getNavigationProgressSnapshot()).toBeGreaterThan(0);
    const firstEpoch = getNavigationProgressSnapshot();
    startNavigationProgress(); // без href — идемпотентно
    expect(getNavigationProgressSnapshot()).toBe(firstEpoch);
    expect(seen).toEqual([firstEpoch]);

    finishNavigationProgress();
    expect(getNavigationProgressSnapshot()).toBe(0);
    expect(seen).toEqual([firstEpoch, 0]);

    unsubscribe();
  });

  it("isSameDocumentUrl сравнивает pathname и search", () => {
    const current = {
      origin: "http://localhost:3000",
      pathname: "/catalog",
      search: "?page=2",
    };
    expect(isSameDocumentUrl("/catalog?page=2", current)).toBe(true);
    expect(isSameDocumentUrl("/catalog", current)).toBe(false);
    expect(isSameDocumentUrl("/cart", current)).toBe(false);
  });

  it("не стартует полосу при href на тот же URL", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "http://localhost:3000",
        pathname: "/catalog",
        search: "",
      },
    });

    startNavigationProgress("/catalog");
    expect(getNavigationProgressSnapshot()).toBe(0);

    startNavigationProgress("/cart");
    expect(getNavigationProgressSnapshot()).toBeGreaterThan(0);
  });

  it("при новом href во время перехода бампит epoch (перезапуск safety)", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "http://localhost:3000",
        pathname: "/",
        search: "",
      },
    });

    const seen: number[] = [];
    const unsubscribe = subscribeNavigationProgress(() => {
      seen.push(getNavigationProgressSnapshot());
    });

    startNavigationProgress("/catalog");
    const firstEpoch = getNavigationProgressSnapshot();
    expect(firstEpoch).toBeGreaterThan(0);

    startNavigationProgress("/cart");
    const secondEpoch = getNavigationProgressSnapshot();
    expect(secondEpoch).toBeGreaterThan(firstEpoch);
    expect(seen).toEqual([firstEpoch, secondEpoch]);

    startNavigationProgress("/cart");
    expect(getNavigationProgressSnapshot()).toBe(secondEpoch);
    expect(seen).toEqual([firstEpoch, secondEpoch]);

    unsubscribe();
  });

  it("кладёт start на window, чтобы instrumentation не импортировал стор", () => {
    const location = {
      origin: "http://localhost:3000",
      pathname: "/",
      search: "",
    };
    vi.stubGlobal("window", { location });

    installNavigationProgressBridge();
    window.__hexStartNavigationProgress?.("/catalog");

    expect(getNavigationProgressSnapshot()).toBeGreaterThan(0);
    expect(window.__hexStartNavigationProgress).toBe(startNavigationProgress);
  });
});
