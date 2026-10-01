"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  finishNavigationProgress,
  getNavigationProgressSnapshot,
  subscribeNavigationProgress,
} from "@/shared/navigation-progress-store";

/** Не мигать полосой на мгновенных переходах из кэша. */
export const SHOW_DELAY_MS = 100;
/** Страховка, если finish по routeKey не сработает (медленный RSC / edge cases). */
export const SAFETY_TIMEOUT_MS = 10_000;

function NavigationProgressBar() {
  const progressEpoch = useSyncExternalStore(
    subscribeNavigationProgress,
    getNavigationProgressSnapshot,
    () => 0,
  );
  const navigating = progressEpoch > 0;
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const prevRouteKeyRef = useRef(routeKey);

  useEffect(() => {
    if (prevRouteKeyRef.current === routeKey) return;
    prevRouteKeyRef.current = routeKey;
    finishNavigationProgress();
  }, [routeKey]);

  useEffect(() => {
    if (!navigating) {
      setVisible(false);
      return;
    }

    const showId = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    const safetyId = window.setTimeout(() => finishNavigationProgress(), SAFETY_TIMEOUT_MS);
    return () => {
      window.clearTimeout(showId);
      window.clearTimeout(safetyId);
    };
    // progressEpoch: новый href бампит epoch при navigating=true — перезапуск таймеров.
  }, [navigating, progressEpoch]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
      aria-busy="true"
      aria-live="polite"
      data-testid="navigation-progress"
    >
      <span className="sr-only">Загрузка страницы</span>
      <div className="nav-progress-bar bg-accent h-full w-full origin-left" />
    </div>
  );
}

/** Полоса прогресса soft-nav: старт из onRouterTransitionStart, финиш по смене URL. */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBar />
    </Suspense>
  );
}
