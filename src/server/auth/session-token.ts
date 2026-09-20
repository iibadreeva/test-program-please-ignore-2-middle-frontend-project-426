import { createHash, randomBytes } from "node:crypto";

/** Opaque session token for the httpOnly cookie (raw, never stored). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest — what we persist in Session.tokenHash. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
