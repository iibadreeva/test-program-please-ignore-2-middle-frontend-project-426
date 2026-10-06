import "server-only";

import { Prisma } from "@prisma/client";

/** Связи заказа для сериализации в контракт API. */
export const orderInclude = {
  items: { orderBy: { id: "asc" as const } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
