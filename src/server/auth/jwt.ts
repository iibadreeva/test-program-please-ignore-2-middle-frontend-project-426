import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
};

let cachedKey: Uint8Array | null = null;

/** Clears the memoized signing key (tests / rare env swaps). */
export function resetSessionSecretCache() {
  cachedKey = null;
}

async function getSecretKey() {
  if (cachedKey) return cachedKey;

  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    cachedKey = new TextEncoder().encode(secret);
    return cachedKey;
  }

  // Contract allows only PORT + DATABASE_URL from outside. Deriving the signing
  // key from DATABASE_URL keeps sessions stable across restarts without a third
  // env var. Trade-off: anyone with DATABASE_URL can forge session tokens — set
  // JWT_SECRET explicitly when that matters.
  const material = process.env.DATABASE_URL;
  if (!material) {
    throw new Error("Set JWT_SECRET (≥ 16 chars) or DATABASE_URL to sign sessions");
  }

  const data = new TextEncoder().encode(`hexparts-session:${material}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  cachedKey = new Uint8Array(digest);
  return cachedKey;
}

export async function signSessionToken(
  payload: SessionPayload,
  maxAgeSeconds: number,
): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(await getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await getSecretKey());
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}
