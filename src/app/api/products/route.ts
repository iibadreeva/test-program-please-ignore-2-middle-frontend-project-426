import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/server/http";
import { listProducts, type ProductSort } from "@/server/services/catalog";
import { listProductsQuerySchema } from "@/shared/api-contract";

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = listProductsQuerySchema.safeParse(raw);

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
