import { z } from "zod";
import {
  AddCartItemBody,
  CreateOrderBody,
  LoginBody,
  Money,
  RegisterBody,
  UpdateCartItemBody,
  type Brand,
  type Cart,
  type CartItem,
  type Category,
  type ErrorBody,
  type ErrorResponse,
  type Order,
  type OrderItem,
  type ProductDetail,
  type ProductListResponse,
  type ProductSummary,
  type UserPublic,
} from "@/generated/api";
import type { Endpoints } from "@/generated/api.types";

export {
  Money,
  AddCartItemBody as addCartItemBodySchema,
  UpdateCartItemBody as updateCartItemBodySchema,
  CreateOrderBody as createOrderBodySchema,
  RegisterBody as registerBodySchema,
  LoginBody as loginBodySchema,
};

export type {
  Money as MoneyString,
  Brand,
  Cart,
  CartItem,
  Category,
  ErrorBody,
  ErrorResponse,
  Order,
  OrderItem,
  ProductDetail,
  ProductListResponse,
  ProductSummary,
  UserPublic,
};

/** Keep sort values aligned with GET /products in the OpenAPI contract. */
type ProductSortQuery = NonNullable<
  NonNullable<Endpoints.get_Catalog_listProducts["parameters"]["query"]>["sort"]
>;

const PRODUCT_SORT_VALUES = [
  "price_asc",
  "price_desc",
  "rating_desc",
  "newest",
] as const satisfies readonly ProductSortQuery[];

/**
 * Query for GET /products with coercion, defaults and app limits.
 * Field set / sort enum stay in sync with the generated OpenAPI types;
 * coerce + defaults stay here because OpenAPI query params are plain strings.
 */
export const listProductsQuerySchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  search: z.string().optional(),
  sort: z.enum(PRODUCT_SORT_VALUES).optional().default("newest"),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(48).optional().default(12),
});
