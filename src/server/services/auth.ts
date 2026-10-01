import "server-only";

import type { z } from "zod";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  AuthError,
  createSession,
  destroySession,
  getCurrentUser,
  type PublicUser,
} from "@/server/auth/session";
import * as usersRepository from "@/server/repositories/users.repository";
import { loginBodySchema, registerBodySchema } from "@/shared/api-contract";

export const registerSchema = registerBodySchema;
export const loginSchema = loginBodySchema;

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;

function toPublic(user: { id: string; email: string; name: string }): PublicUser {
  return { id: user.id, email: user.email, name: user.name };
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "user";
  return local.length >= 2 ? local.slice(0, 80) : `user-${local}`;
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const data = registerSchema.parse(input);
  const email = data.email.trim().toLowerCase();
  const name = data.name?.trim() || nameFromEmail(email);

  const existing = await usersRepository.findUserByEmail(email);
  if (existing) {
    throw new AuthError("CONFLICT", "Пользователь с таким email уже есть");
  }

  const passwordHash = await hashPassword(data.password);
  let user;
  try {
    user = await usersRepository.createUser({
      email,
      name,
      passwordHash,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      throw new AuthError("CONFLICT", "Пользователь с таким email уже есть");
    }
    throw error;
  }

  const publicUser = toPublic(user);
  await createSession(publicUser);
  return publicUser;
}

export async function loginUser(input: LoginInput): Promise<PublicUser> {
  const data = loginSchema.parse(input);
  const email = data.email.trim().toLowerCase();

  const user = await usersRepository.findUserByEmail(email);
  if (!user) {
    throw new AuthError("UNAUTHORIZED", "Неверный email или пароль");
  }

  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) {
    throw new AuthError("UNAUTHORIZED", "Неверный email или пароль");
  }

  const publicUser = toPublic(user);
  await createSession(publicUser);
  return publicUser;
}

export async function logoutUser(): Promise<void> {
  await destroySession();
}

export async function getMe(): Promise<PublicUser | null> {
  return getCurrentUser();
}
