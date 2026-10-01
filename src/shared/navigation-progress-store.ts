/** Состояние глобального индикатора soft-навигации App Router. */

type Listener = () => void;

/** 0 — idle; иначе epoch текущего перехода (бампится при новом href). */
let epoch = 0;
let activeHref: string | undefined;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

/** true, если href ведёт на тот же pathname+search (повторный клик / soft-refresh). */
export function isSameDocumentUrl(href: string, current: Pick<Location, "pathname" | "search" | "origin">) {
  try {
    const next = new URL(href, current.origin);
    return next.pathname === current.pathname && next.search === current.search;
  } catch {
    return false;
  }
}

/**
 * Старт полосы. href — из onRouterTransitionStart: при том же URL не стартуем,
 * иначе finish по routeKey не сработает и полоса «залипнет» до safety timeout.
 * Новый href во время перехода бампит epoch — UI перезапускает safety-таймер.
 */
export function startNavigationProgress(href?: string) {
  if (
    typeof window !== "undefined" &&
    href &&
    isSameDocumentUrl(href, window.location)
  ) {
    return;
  }

  if (epoch > 0) {
    if (href === undefined || href === activeHref) return;
    activeHref = href;
    epoch += 1;
    emit();
    return;
  }

  activeHref = href;
  epoch = 1;
  emit();
}

export function finishNavigationProgress() {
  if (epoch === 0) return;
  epoch = 0;
  activeHref = undefined;
  emit();
}

/** 0 — нет перехода; иначе generation для перезапуска таймеров в UI. */
export function getNavigationProgressSnapshot() {
  return epoch;
}

export function subscribeNavigationProgress(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * instrumentation-client живёт в отдельном графе Turbopack (`[client]`).
 * Прямой импорт этого модуля оттуда создаёт вторую копию и при HMR
 * сносит factory у `[app-client]`, из-за чего падает navigation-progress.
 * Сюда пишет только app-client копия, её и вызывает onRouterTransitionStart.
 */
export function installNavigationProgressBridge() {
  if (typeof window === "undefined") return;
  window.__hexStartNavigationProgress = startNavigationProgress;
}

installNavigationProgressBridge();

declare global {
  interface Window {
    __hexStartNavigationProgress?: (href?: string) => void;
  }
}
