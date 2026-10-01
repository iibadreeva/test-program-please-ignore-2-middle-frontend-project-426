import "server-only";

import { Prisma } from "@prisma/client";

/** Сессия с публичными полями пользователя — без passwordHash. */
export const sessionUserInclude = {
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.SessionInclude;

export type SessionWithUser = Prisma.SessionGetPayload<{ include: typeof sessionUserInclude }>;
