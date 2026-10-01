import type { PublicUser } from "@/shared/user";

/** sessionStorage: снимок шапки между reload, чтобы не мигал скелетон. */
export const HEADER_AUTH_CACHE_KEY = "shop:header-auth:v2";

/** Минимум для UI шапки — без email (PII). */
type HeaderAuthCacheSnapshot = {
  id: string;
  name: string;
};

export function isPublicUser(value: unknown): value is PublicUser {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.id === "string" &&
    typeof body.email === "string" &&
    typeof body.name === "string"
  );
}

function isHeaderAuthSnapshot(value: unknown): value is HeaderAuthCacheSnapshot {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return typeof body.id === "string" && typeof body.name === "string";
}

export function readCachedUser(): PublicUser | null | undefined {
  try {
    const raw = sessionStorage.getItem(HEADER_AUTH_CACHE_KEY);
    if (raw === null) return undefined;
    // Legacy: раньше гостя писали как "".
    if (raw === "") return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isHeaderAuthSnapshot(parsed)) return undefined;
    // email только с /api/auth/me — в кэше не храним и не доверяем.
    return { id: parsed.id, name: parsed.name, email: "" };
  } catch {
    return undefined;
  }
}

export function writeCachedUser(user: PublicUser | null) {
  try {
    if (user) {
      const snapshot: HeaderAuthCacheSnapshot = { id: user.id, name: user.name };
      sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, JSON.stringify(snapshot));
      return;
    }
    // Гостя не персистим: иначе после логина hard-nav мигнёт «Войти» из "".
    sessionStorage.removeItem(HEADER_AUTH_CACHE_KEY);
  } catch {
    // private mode / quota — шапка просто снова покажет скелетон.
  }
}

export function clearAuthCache() {
  try {
    sessionStorage.removeItem(HEADER_AUTH_CACHE_KEY);
  } catch {
    // private mode / quota
  }
}
