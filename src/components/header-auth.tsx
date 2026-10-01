"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  clearAuthCache,
  isPublicUser,
  readCachedUser,
  writeCachedUser,
} from "@/components/header-auth-cache";
import { logoutAction } from "@/features/auth/actions";
import { routes } from "@/shared/routes";
import type { PublicUser } from "@/shared/user";

export const AUTH_ME_TIMEOUT_MS = 8_000;
/** Периодическая проверка сессии: soft-nav сам /me не дергает. */
export const AUTH_ME_POLL_MS = 5 * 60 * 1000;

export { HEADER_AUTH_CACHE_KEY } from "@/components/header-auth-cache";

function isAuthFormPath(pathname: string): boolean {
  return pathname === routes.login || pathname === routes.register;
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/**
 * Auth в шапке после mount: layout без cookies(), чтобы публичные
 * страницы могли кэшироваться (revalidate / Full Route Cache).
 * /api/auth/me: mount вне auth-форм, уход с login/register, возврат на вкладку,
 * visibilitychange и poll каждые AUTH_ME_POLL_MS.
 * На login/register me не дергаем: UI сразу гость, кэш чистим.
 * 401 → гость; сеть/5xx/timeout/битый 200 не сбрасывают известного user.
 * Уход с login/register: гость → скелетон (сессия могла только что появиться);
 * при soft-fail — один retry, чтобы не залипнуть «Войти» после успешного логина.
 * Logout оптимистичен; при ошибке (не redirect) откатываем user.
 * sessionStorage: только id+name (не email), не guest; hydrate один раз на mount —
 * soft-nav не перечитывает кэш (иначе 401 откатывался бы устаревшей записью).
 */
export function HeaderAuth() {
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);
  const userRef = useRef(user);
  userRef.current = user;
  const prevPathnameRef = useRef<string | null>(null);
  /** После ухода с login/register: soft-fail даёт один retry, не сразу гостя. */
  const authLeaveRetryRef = useRef(false);
  /** Инкремент запускает fetch: mount / leave auth / visibility. */
  const [fetchEpoch, setFetchEpoch] = useState(0);

  // Только mount: не зависеть от pathname, иначе soft-nav снова поднимет кэш.
  useLayoutEffect(() => {
    if (isAuthFormPath(pathname)) {
      clearAuthCache();
      setUser(null);
      return;
    }
    const cached = readCachedUser();
    if (cached !== undefined) setUser(cached);
    // pathname читаем только при первом paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, []);

  useLayoutEffect(() => {
    if (!isAuthFormPath(pathname)) return;
    clearAuthCache();
    setUser(null);
  }, [pathname]);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    const onAuthForm = isAuthFormPath(pathname);
    const leftAuthForm = prev !== null && isAuthFormPath(prev);
    prevPathnameRef.current = pathname;

    // На форме логина/регистрации сессию не проверяем — UI гость до ухода.
    if (onAuthForm) return;

    if (leftAuthForm) {
      // Гость на форме мог только что залогиниться — UI снова «проверяет сессию».
      authLeaveRetryRef.current = true;
      setUser((current) => (current === null ? undefined : current));
    }
    const shouldFetch = prev === null || leftAuthForm;
    if (shouldFetch) setFetchEpoch((n) => n + 1);
  }, [pathname]);

  const fetchAllowed = !isAuthFormPath(pathname);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      // На auth-форме me не нужен — иначе 200 вернёт «Аккаунт» на /login.
      if (!fetchAllowed) return;
      setFetchEpoch((n) => n + 1);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchAllowed]);

  useEffect(() => {
    if (!fetchAllowed) return;
    const intervalId = window.setInterval(() => {
      setFetchEpoch((n) => n + 1);
    }, AUTH_ME_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchAllowed]);

  useEffect(() => {
    if (fetchEpoch === 0 || !fetchAllowed) return;

    // cancelled = только cleanup эффекта; timeout abort — soft-fail, не «тихий» выход.
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), AUTH_ME_TIMEOUT_MS);

    function applySoftFetchFailure() {
      if (cancelled) return;
      const prev = userRef.current;
      if (prev) {
        authLeaveRetryRef.current = false;
        return;
      }
      if (authLeaveRetryRef.current) {
        authLeaveRetryRef.current = false;
        setUser(undefined);
        setFetchEpoch((n) => n + 1);
        return;
      }
      setUser(null);
    }

    void fetch("/api/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (cancelled) return;
        // Только 401 = нет сессии. Сеть/5xx/timeout не разлогинивают (кэш/UI сохраняем).
        if (res.status === 401) {
          authLeaveRetryRef.current = false;
          setUser(null);
          writeCachedUser(null);
          return;
        }
        if (!res.ok) {
          applySoftFetchFailure();
          return;
        }
        const body: unknown = await res.json();
        // После await json гонка с cleanup: не писать stale-сессию в шапку.
        if (cancelled) return;
        if (!isPublicUser(body)) {
          applySoftFetchFailure();
          return;
        }
        authLeaveRetryRef.current = false;
        setUser(body);
        writeCachedUser(body);
      })
      .catch(() => {
        applySoftFetchFailure();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fetchEpoch, fetchAllowed]);

  async function handleLogout() {
    const previous = user ?? null;
    setUser(null);
    writeCachedUser(null);
    try {
      await logoutAction();
    } catch (error) {
      if (isRedirectError(error)) throw error;
      setUser(previous);
      writeCachedUser(previous);
    }
  }

  if (user === undefined) {
    return (
      <div
        className="bg-surface-2 ml-1 h-9 w-28 animate-pulse border border-transparent"
        aria-busy="true"
        aria-label="Проверка сессии"
        data-testid="nav-auth-skeleton"
      />
    );
  }

  if (user) {
    return (
      <>
        <Link
          href={routes.account}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-muted transition hover:text-text"
          data-testid="nav-account"
        >
          <User className="size-4" aria-hidden />
          <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
        </Link>
        <form action={handleLogout}>
          <button
            type="submit"
            className="ml-1 border border-border px-3 py-1.5 text-sm transition hover:border-accent"
            data-testid="nav-signout"
          >
            Выйти
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link
        href={routes.login}
        className="ml-1 border border-border px-3 py-1.5 text-sm transition hover:border-accent"
        data-testid="nav-signin"
      >
        Войти
      </Link>
      <Link
        href={routes.register}
        className="border border-border px-3 py-1.5 text-sm transition hover:border-accent"
        data-testid="nav-signup"
      >
        Регистрация
      </Link>
    </>
  );
}
