// @ts-nocheck
import type * as __TypedOpenapi from "./api.types.js";

import { z } from "zod";

// <Schemas>
export type Brand = __TypedOpenapi.Schemas.Brand;
export const Brand = z.strictObject({ id: z.string(), slug: z.string(), name: z.string() });

export type Category = __TypedOpenapi.Schemas.Category;
export const Category = z.strictObject({ id: z.string(), slug: z.string(), name: z.string() });

export type OrderLineInput = __TypedOpenapi.Schemas.OrderLineInput;
export const OrderLineInput = z.strictObject({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export type CreateOrderBody = __TypedOpenapi.Schemas.CreateOrderBody;
export const CreateOrderBody = z.strictObject({
  deliveryType: z.enum(["delivery", "pickup"]),
  address: z.string().optional(),
  recipientName: z.string(),
  phone: z.string(),
  items: z.array(OrderLineInput).min(1).max(100),
});

export type ErrorBody = __TypedOpenapi.Schemas.ErrorBody;
export const ErrorBody = z.strictObject({ code: z.string(), message: z.string(), details: z.unknown().optional() });

export type ErrorResponse = __TypedOpenapi.Schemas.ErrorResponse;
export const ErrorResponse = z.strictObject({ error: ErrorBody });

export type LoginBody = __TypedOpenapi.Schemas.LoginBody;
export const LoginBody = z.strictObject({ email: z.email().min(1), password: z.string().min(1) });

export type Money = __TypedOpenapi.Schemas.Money;
export const Money = z.string().regex(new RegExp("^(0|[1-9][0-9]*)$"));

export type OrderItem = __TypedOpenapi.Schemas.OrderItem;
export const OrderItem = z.strictObject({
  id: z.string(),
  productId: z.string().optional(),
  titleSnapshot: z.string(),
  priceSnapshot: Money,
  imageUrlSnapshot: z.string(),
  quantity: z.number().int(),
  lineTotal: Money,
});

export type Order = __TypedOpenapi.Schemas.Order;
export const Order = z.strictObject({
  id: z.string(),
  status: z.literal("paid"),
  deliveryType: z.enum(["delivery", "pickup"]),
  address: z.string().optional(),
  recipientName: z.string(),
  phone: z.string(),
  total: Money,
  createdAt: z.iso.datetime(),
  items: z.array(OrderItem),
});

export type OrderProblemItem = __TypedOpenapi.Schemas.OrderProblemItem;
export const OrderProblemItem = z.strictObject({
  productId: z.string(),
  title: z.string().optional(),
  reason: z.enum(["not_found", "unavailable"]),
  requested: z.number().int(),
  available: z.number().int(),
});

export type OrderItemsUnavailableError = __TypedOpenapi.Schemas.OrderItemsUnavailableError;
export const OrderItemsUnavailableError = z.strictObject({
  error: z.strictObject({
    code: z.literal("ORDER_ITEMS_UNAVAILABLE"),
    message: z.string(),
    details: z.array(OrderProblemItem),
  }),
});

export type PaginationMeta = __TypedOpenapi.Schemas.PaginationMeta;
export const PaginationMeta = z.strictObject({
  page: z.number().int(),
  perPage: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type ProductSummary = __TypedOpenapi.Schemas.ProductSummary;
export const ProductSummary = z.strictObject({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  price: Money,
  oldPrice: Money.optional(),
  imageUrl: z.string().nullable(),
  stock: z.number().int(),
  available: z.boolean(),
  rating: z.number(),
  category: Category,
  brand: Brand,
});

export type ProductDetail = __TypedOpenapi.Schemas.ProductDetail;
export const ProductDetail = ProductSummary.and(z.strictObject({ specs: z.record(z.string(), z.unknown()) }));

export type ProductListResponse = __TypedOpenapi.Schemas.ProductListResponse;
export const ProductListResponse = z.strictObject({ items: z.array(ProductSummary), meta: PaginationMeta });

export type PromoBlock = __TypedOpenapi.Schemas.PromoBlock;
export const PromoBlock = z.strictObject({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  product: ProductSummary,
});

export type RegisterBody = __TypedOpenapi.Schemas.RegisterBody;
export const RegisterBody = z.strictObject({
  email: z.email().min(1),
  password: z.string().min(8),
  name: z.string().min(2).max(80).optional(),
});

export type UserPublic = __TypedOpenapi.Schemas.UserPublic;
export const UserPublic = z.strictObject({ id: z.string(), email: z.string(), name: z.string() });

// </Schemas>

// <Endpoints>
export type post_Auth_login = __TypedOpenapi.Endpoints.post_Auth_login;
export const post_Auth_login = {
  method: z.literal("POST"),
  path: z.literal("/auth/login"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: LoginBody },
  responses: { 200: UserPublic, 401: ErrorResponse },
};

export type post_Auth_logout = __TypedOpenapi.Endpoints.post_Auth_logout;
export const post_Auth_logout = {
  method: z.literal("POST"),
  path: z.literal("/auth/logout"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 204: z.unknown() },
};

export type get_Auth_me = __TypedOpenapi.Endpoints.get_Auth_me;
export const get_Auth_me = {
  method: z.literal("GET"),
  path: z.literal("/auth/me"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: UserPublic, 401: ErrorResponse },
};

export type post_Auth_register = __TypedOpenapi.Endpoints.post_Auth_register;
export const post_Auth_register = {
  method: z.literal("POST"),
  path: z.literal("/auth/register"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: RegisterBody },
  responses: { 201: UserPublic, 400: ErrorResponse, 409: ErrorResponse },
};

export type get_Catalog_listBrands = __TypedOpenapi.Endpoints.get_Catalog_listBrands;
export const get_Catalog_listBrands = {
  method: z.literal("GET"),
  path: z.literal("/brands"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.array(Brand) },
};

export type get_Catalog_listCategories = __TypedOpenapi.Endpoints.get_Catalog_listCategories;
export const get_Catalog_listCategories = {
  method: z.literal("GET"),
  path: z.literal("/categories"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.array(Category) },
};

export type post_Orders_create = __TypedOpenapi.Endpoints.post_Orders_create;
export const post_Orders_create = {
  method: z.literal("POST"),
  path: z.literal("/orders"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: CreateOrderBody },
  responses: { 201: Order, 400: ErrorResponse, 401: ErrorResponse, 409: OrderItemsUnavailableError },
};

export type get_Orders_list = __TypedOpenapi.Endpoints.get_Orders_list;
export const get_Orders_list = {
  method: z.literal("GET"),
  path: z.literal("/orders"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.array(Order), 401: ErrorResponse },
};

export type get_Orders_get = __TypedOpenapi.Endpoints.get_Orders_get;
export const get_Orders_get = {
  method: z.literal("GET"),
  path: z.literal("/orders/{id}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ id: z.string() }) },
  responses: { 200: Order, 401: ErrorResponse, 404: ErrorResponse },
};

export type get_Catalog_listProducts = __TypedOpenapi.Endpoints.get_Catalog_listProducts;
export const get_Catalog_listProducts = {
  method: z.literal("GET"),
  path: z.literal("/products"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: {
    query: z
      .strictObject({
        category: z.string(),
        brand: z.string(),
        minPrice: z.coerce.number().int(),
        maxPrice: z.coerce.number().int(),
        available: z
          .union([z.boolean(), z.string(), z.number()])
          .transform((x) => x === true || x === "true" || x === 1 || x === "1"),
        search: z.string(),
        sort: z.enum(["price_asc", "price_desc", "rating_desc", "newest"]),
        page: z.coerce.number().int(),
        perPage: z.coerce.number().int(),
      })
      .partial()
      .optional(),
  },
  responses: { 200: ProductListResponse },
};

export type get_Catalog_getProduct = __TypedOpenapi.Endpoints.get_Catalog_getProduct;
export const get_Catalog_getProduct = {
  method: z.literal("GET"),
  path: z.literal("/products/{slug}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ slug: z.string() }) },
  responses: { 200: ProductDetail, 404: ErrorResponse },
};

export type get_Home_listPromos = __TypedOpenapi.Endpoints.get_Home_listPromos;
export const get_Home_listPromos = {
  method: z.literal("GET"),
  path: z.literal("/promos"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.array(PromoBlock) },
};

// </Endpoints>

// <EndpointByMethod>
export const EndpointByMethod = {
  post: {
    "/auth/login": post_Auth_login,
    "/auth/logout": post_Auth_logout,
    "/auth/register": post_Auth_register,
    "/orders": post_Orders_create,
  },
  get: {
    "/auth/me": get_Auth_me,
    "/brands": get_Catalog_listBrands,
    "/categories": get_Catalog_listCategories,
    "/orders": get_Orders_list,
    "/orders/{id}": get_Orders_get,
    "/products": get_Catalog_listProducts,
    "/products/{slug}": get_Catalog_getProduct,
    "/promos": get_Home_listPromos,
  },
} satisfies {
  [M in keyof __TypedOpenapi.EndpointByMethod]: { [P in keyof __TypedOpenapi.EndpointByMethod[M]]: unknown };
};
export type EndpointByMethod = __TypedOpenapi.EndpointByMethod;
// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type PostEndpoints = EndpointByMethod["post"];
export type GetEndpoints = EndpointByMethod["get"];
// </EndpointByMethod.Shorthands>
