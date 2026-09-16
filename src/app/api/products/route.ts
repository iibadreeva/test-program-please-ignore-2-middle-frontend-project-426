import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/server/http";
import { listProducts, type ProductSort } from "@/server/services/catalog";

const querySchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  search: z.string().optional(),
  sort: z
    .enum(["price_asc", "price_desc", "rating_desc", "newest"])
    .optional()
    .default("newest"),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(48).optional().default(12),
});

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(raw);

  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Некорректные параметры фильтра", parsed.error.flatten());
  }

  try {
    const data = await listProducts({
      ...parsed.data,
      sort: parsed.data.sort as ProductSort,
    });
    return apiOk(data);
  } catch {
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}
