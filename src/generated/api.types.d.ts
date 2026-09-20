export namespace Schemas {
  // <Schemas>
  export type AddCartItemBody = {
    productId: string;
    /**
     * Количество единиц товара
     */
    quantity?: number;
  };
  export type Brand = { id: string; slug: string; name: string };
  /**
   * Денежная сумма в целых рублях (десятичная строка без копеек, без ведущих нулей)
   */
  export type Money = string;
  export type Category = { id: string; slug: string; name: string };
  export type ProductSummary = {
    id: string;
    slug: string;
    title: string;
    /**
     * Краткое описание для карточки в списке
     */
    description: string;
    price: Money;
    oldPrice?: Money;
    /**
     * null означает, что изображения нет — клиент показывает заглушку
     */
    imageUrl: string | null;
    stock: number;
    /**
     * Товар доступен к покупке (остаток больше нуля)
     */
    available: boolean;
    rating: number;
    category: Category;
    brand: Brand;
  };
  export type CartItem = { id: string; productId: string; quantity: number; product: ProductSummary; lineTotal: Money };
  export type Cart = { id: string; items: Array<CartItem>; total: Money; itemsCount: number };
  export type CreateOrderBody = {
    deliveryType: "DELIVERY" | "PICKUP";
    address?: string;
    pickupPointId?: string;
    recipientName: string;
    phone: string;
    comment?: string;
  };
  export type ErrorBody = { code: string; message: string; details?: unknown };
  export type ErrorResponse = { error: ErrorBody };
  export type LoginBody = { email: string; password: string };
  export type PickupPoint = { id: string; name: string; address: string };
  export type OrderItem = {
    id: string;
    productId?: string;
    titleSnapshot: string;
    priceSnapshot: Money;
    imageUrlSnapshot: string;
    quantity: number;
    lineTotal: Money;
  };
  export type Order = {
    id: string;
    status: "NEW" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED";
    deliveryType: "DELIVERY" | "PICKUP";
    address?: string;
    pickupPointId?: string;
    /**
     * Развёрнутый пункт самовывоза; null для доставки или если пункт удалён
     */
    pickupPoint: (PickupPoint & (Record<string, unknown> | null)) | null;
    recipientName: string;
    phone: string;
    comment?: string;
    total: Money;
    createdAt: string;
    items: Array<OrderItem>;
  };
  export type PaginationMeta = { page: number; perPage: number; total: number; totalPages: number };
  export type ProductDetail = ProductSummary & { specs: Record<string, unknown> };
  export type ProductListResponse = { items: Array<ProductSummary>; meta: PaginationMeta };
  export type RegisterBody = { email: string; password: string; name?: string };
  export type UpdateCartItemBody = {
    /**
     * Количество единиц товара
     */
    quantity: number;
  };
  export type UserPublic = { id: string; email: string; name: string };

  // </Schemas>
}

export namespace Endpoints {
  // <Endpoints>

  export type post_Auth_login = {
    method: "POST";
    path: "/auth/login";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      body: Schemas.LoginBody;
    };
    responses: { 200: Schemas.UserPublic; 401: Schemas.ErrorResponse };
  };
  export type post_Auth_logout = {
    method: "POST";
    path: "/auth/logout";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 204: unknown };
  };
  export type get_Auth_me = {
    method: "GET";
    path: "/auth/me";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Schemas.UserPublic; 401: Schemas.ErrorResponse };
  };
  export type post_Auth_register = {
    method: "POST";
    path: "/auth/register";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      body: Schemas.RegisterBody;
    };
    responses: { 201: Schemas.UserPublic; 400: Schemas.ErrorResponse; 409: Schemas.ErrorResponse };
  };
  export type get_Catalog_listBrands = {
    method: "GET";
    path: "/brands";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Array<Schemas.Brand> };
  };
  export type get_CartApi_getCart = {
    method: "GET";
    path: "/cart";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Schemas.Cart };
  };
  export type delete_CartApi_clearCart = {
    method: "DELETE";
    path: "/cart";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 204: unknown };
  };
  export type post_CartApi_addItem = {
    method: "POST";
    path: "/cart/items";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      body: Schemas.AddCartItemBody;
    };
    responses: { 201: Schemas.Cart; 400: Schemas.ErrorResponse };
  };
  export type patch_CartApi_updateItem = {
    method: "PATCH";
    path: "/cart/items/{id}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { id: string };

      body: Schemas.UpdateCartItemBody;
    };
    responses: { 200: Schemas.Cart; 404: Schemas.ErrorResponse };
  };
  export type delete_CartApi_removeItem = {
    method: "DELETE";
    path: "/cart/items/{id}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { id: string };
    };
    responses: { 200: Schemas.Cart; 404: Schemas.ErrorResponse };
  };
  export type get_Catalog_listCategories = {
    method: "GET";
    path: "/categories";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Array<Schemas.Category> };
  };
  export type post_Orders_create = {
    method: "POST";
    path: "/orders";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      body: Schemas.CreateOrderBody;
    };
    responses: { 201: Schemas.Order; 400: Schemas.ErrorResponse; 401: Schemas.ErrorResponse };
  };
  export type get_Orders_list = {
    method: "GET";
    path: "/orders";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Array<Schemas.Order>; 401: Schemas.ErrorResponse };
  };
  export type get_Orders_get = {
    method: "GET";
    path: "/orders/{id}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { id: string };
    };
    responses: { 200: Schemas.Order; 401: Schemas.ErrorResponse; 404: Schemas.ErrorResponse };
  };
  export type get_Catalog_listPickupPoints = {
    method: "GET";
    path: "/pickup-points";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Array<Schemas.PickupPoint> };
  };
  export type get_Catalog_listProducts = {
    method: "GET";
    path: "/products";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query?: Partial<{
        category: string;
        brand: string;
        minPrice: number;
        maxPrice: number;
        available: boolean;
        search: string;
        sort: "price_asc" | "price_desc" | "rating_desc" | "newest";
        page: number;
        perPage: number;
      }>;
    };
    responses: { 200: Schemas.ProductListResponse };
  };
  export type get_Catalog_getProduct = {
    method: "GET";
    path: "/products/{slug}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { slug: string };
    };
    responses: { 200: Schemas.ProductDetail; 404: Schemas.ErrorResponse };
  };

  // </Endpoints>
}

// <EndpointByMethod>
export type EndpointByMethod = {
  post: {
    "/auth/login": Endpoints.post_Auth_login;
    "/auth/logout": Endpoints.post_Auth_logout;
    "/auth/register": Endpoints.post_Auth_register;
    "/cart/items": Endpoints.post_CartApi_addItem;
    "/orders": Endpoints.post_Orders_create;
  };
  get: {
    "/auth/me": Endpoints.get_Auth_me;
    "/brands": Endpoints.get_Catalog_listBrands;
    "/cart": Endpoints.get_CartApi_getCart;
    "/categories": Endpoints.get_Catalog_listCategories;
    "/orders": Endpoints.get_Orders_list;
    "/orders/{id}": Endpoints.get_Orders_get;
    "/pickup-points": Endpoints.get_Catalog_listPickupPoints;
    "/products": Endpoints.get_Catalog_listProducts;
    "/products/{slug}": Endpoints.get_Catalog_getProduct;
  };
  delete: {
    "/cart": Endpoints.delete_CartApi_clearCart;
    "/cart/items/{id}": Endpoints.delete_CartApi_removeItem;
  };
  patch: {
    "/cart/items/{id}": Endpoints.patch_CartApi_updateItem;
  };
};

// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type PostEndpoints = EndpointByMethod["post"];
export type GetEndpoints = EndpointByMethod["get"];
export type DeleteEndpoints = EndpointByMethod["delete"];
export type PatchEndpoints = EndpointByMethod["patch"];
// </EndpointByMethod.Shorthands>
