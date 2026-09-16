import { z } from "zod";
import { prisma } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  AuthError,
  createSession,
  destroySession,
  getCurrentUser,
  type PublicUser,
} from "@/server/auth/session";
import { mergeGuestCartIntoUser } from "@/server/services/cart";

export const registerSchema = z.object({
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(8, "Пароль не короче 8 символов"),
  name: z.string().trim().min(2, "Имя не короче 2 символов").max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

function toPublic(user: { id: string; email: string; name: string }): PublicUser {
  return { id: user.id, email: user.email, name: user.name };
}

export async function registerUser(input: z.infer<typeof registerSchema>): Promise<PublicUser> {
  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthError("CONFLICT", "Пользователь с таким email уже есть");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: data.name,
      passwordHash,
    },
  });

  const publicUser = toPublic(user);
  await createSession(publicUser);
  await mergeGuestCartIntoUser(user.id);
  return publicUser;
}

export async function loginUser(input: z.infer<typeof loginSchema>): Promise<PublicUser> {
  const data = loginSchema.parse(input);
  const email = data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AuthError("UNAUTHORIZED", "Неверный email или пароль");
  }

  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) {
    throw new AuthError("UNAUTHORIZED", "Неверный email или пароль");
  }

  const publicUser = toPublic(user);
  await createSession(publicUser);
  await mergeGuestCartIntoUser(user.id);
  return publicUser;
}

export async function logoutUser(): Promise<void> {
  await destroySession();
}

export async function getMe(): Promise<PublicUser | null> {
  return getCurrentUser();
}
