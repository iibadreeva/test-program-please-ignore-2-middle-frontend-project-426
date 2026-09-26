/**
 * Secure-флаг session-cookie: только по явному env.
 * На HTTP (Hexlet/docker) браузер отбрасывает Secure-cookie.
 */
export function isCookieSecure(
  value: string | undefined = process.env.COOKIE_SECURE,
): boolean {
  return value === "true" || value === "1";
}
