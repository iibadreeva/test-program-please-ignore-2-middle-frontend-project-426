import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { generateSessionToken, hashToken } from "@/server/auth/session-token";
import { AuthError } from "@/server/errors";
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from "@/shared/constants";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
};

/**
 * Secure-флаг только по явному env: на HTTP (Hexlet/docker) браузер
 * отбрасывает Secure-cookie, и сессия «пропадает» после reload.
 * На HTTPS-хостинге задайте COOKIE_SECURE=true.
 */
function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.COOKIE_SECURE === "true" || process.env.COOKIE_SECURE === "1",
    maxAge,
  };
}

export async function createSession(user: PublicUser): Promise<void> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE * 1000);

  await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_COOKIE_MAX_AGE));
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  // Те же path/secure, иначе браузер может не снять cookie.
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

async function loadCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

/** Deduplicates layout + page reads within one request. */
export const getCurrentUser = cache(loadCurrentUser);

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("UNAUTHORIZED", "Требуется вход");
  }
  return user;
}

export { AuthError } from "@/server/errors";
