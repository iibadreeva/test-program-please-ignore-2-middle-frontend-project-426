import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from "@/shared/constants";
import { signSessionToken, verifySessionToken, type SessionPayload } from "@/server/auth/jwt";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
};

export async function createSession(user: PublicUser): Promise<void> {
  const token = await signSessionToken(
    { sub: user.id, email: user.email, name: user.name },
    SESSION_COOKIE_MAX_AGE,
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSessionPayload(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const payload = await readSessionPayload();
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("UNAUTHORIZED", "Требуется вход");
  }
  return user;
}

export class AuthError extends Error {
  constructor(
    public code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
