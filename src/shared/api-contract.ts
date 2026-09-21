import { z } from "zod";
import {
  CreateOrderBody,
  LoginBody,
  Money,
  RegisterBody,
  type Brand,
  type Category,
  type ErrorBody,
  type ErrorResponse,
  type Order,
  type OrderItem,
  type ProductDetail,
  type ProductListResponse,
  type ProductSummary,
  type PromoBlock,
  type UserPublic,
} from "@/generated/api";
import type { Endpoints } from "@/generated/api.types";

export {
  Money,
  CreateOrderBody as createOrderBodySchema,
  RegisterBody as registerBodySchema,
  LoginBody as loginBodySchema,
};

export type {
  Money as MoneyString,
  Brand,
  Category,
  ErrorBody,
  ErrorResponse,
  Order,
  OrderItem,
  ProductDetail,
  ProductListResponse,
  ProductSummary,
  PromoBlock,
  UserPublic,
};

/** Keep query params aligned with GET /products in the OpenAPI contract. */
type ListProductsQueryContract = NonNullable<
  NonNullable<Endpoints.get_Catalog_listProducts["parameters"]["query"]>
>;

type ProductSortQuery = NonNullable<ListProductsQueryContract["sort"]>;

const PRODUCT_SORT_VALUES = [
  "price_asc",
  "price_desc",
  "rating_desc",
  "newest",
] as const satisfies readonly ProductSortQuery[];

export const PRODUCTS_PER_PAGE = 12;
const MAX_PRODUCTS_PER_PAGE = 48;

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
  available: z.stringbool().optional(),
  search: z.string().optional(),
  sort: z.enum(PRODUCT_SORT_VALUES).optional().default("newest"),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PRODUCTS_PER_PAGE)
    .optional()
    .default(PRODUCTS_PER_PAGE),
});

export type ListProductsQuery = z.output<typeof listProductsQuerySchema>;

/** Fails to compile if the schema and the contract query params drift apart. */
type AssertQueryFieldsMatchContract =
  keyof ListProductsQuery extends keyof ListProductsQueryContract
    ? keyof ListProductsQueryContract extends keyof ListProductsQuery
      ? true
      : never
    : never;

export const listProductsQueryMatchesContract: AssertQueryFieldsMatchContract = true;
