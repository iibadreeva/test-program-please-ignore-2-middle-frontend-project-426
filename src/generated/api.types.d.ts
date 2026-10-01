export namespace Schemas {
  // <Schemas>
  export type Brand = { id: string; slug: string; name: string };
  export type Category = { id: string; slug: string; name: string };
  export type OrderLineInput = {
    productId: string;
    /**
     * Количество единиц товара (лимит совпадает с MAX_CART_LINE_QTY на клиенте)
     */
    quantity: number;
  };
  export type CreateOrderBody = {
    deliveryType: "delivery" | "pickup";
    /**
     * Обязателен при delivery; при pickup не передаётся
     */
    address?: string;
    recipientName: string;
    phone: string;
    /**
     * Состав заказа с клиента (корзина живёт в localStorage); max = MAX_CART_IDS. Без цен.
     */
    items: Array<OrderLineInput>;
  };
  export type ErrorBody = { code: string; message: string; details?: unknown };
  export type ErrorResponse = { error: ErrorBody };
  export type LoginBody = { email: string; password: string };
  /**
   * Денежная сумма в целых рублях (десятичная строка без копеек, без ведущих нулей)
   */
  export type Money = string;
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
    status: "paid";
    deliveryType: "delivery" | "pickup";
    address?: string;
    recipientName: string;
    phone: string;
    total: Money;
    createdAt: string;
    items: Array<OrderItem>;
  };
  /**
   * Проблемная позиция при атомарном отказе оформления
   */
  export type OrderProblemItem = {
    productId: string;
    /**
     * Название на момент отказа; отсутствует, если товар не найден
     */
    title?: string;
    reason: "not_found" | "unavailable";
    requested: number;
    available: number;
  };
  export type OrderItemsUnavailableError = {
    error: { code: "ORDER_ITEMS_UNAVAILABLE"; message: string; details: Array<OrderProblemItem> };
  };
  export type PaginationMeta = { page: number; perPage: number; total: number; totalPages: number };
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
  export type ProductDetail = ProductSummary & { specs: Record<string, unknown> };
  export type ProductListResponse = { items: Array<ProductSummary>; meta: PaginationMeta };
  /**
   * Промо-блок главной страницы: текст плюс товар, на который он ведёт
   */
  export type PromoBlock = { id: string; title: string; text: string; product: ProductSummary };
  export type RegisterBody = { email: string; password: string; name?: string };
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
    responses: {
      201: Schemas.Order;
      400: Schemas.ErrorResponse;
      401: Schemas.ErrorResponse;
      409: Schemas.OrderItemsUnavailableError;
    };
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
  export type get_Home_listPromos = {
    method: "GET";
    path: "/promos";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Array<Schemas.PromoBlock> };
  };

  // </Endpoints>
}

// <EndpointByMethod>
export type EndpointByMethod = {
  post: {
    "/auth/login": Endpoints.post_Auth_login;
    "/auth/logout": Endpoints.post_Auth_logout;
    "/auth/register": Endpoints.post_Auth_register;
    "/orders": Endpoints.post_Orders_create;
  };
  get: {
    "/auth/me": Endpoints.get_Auth_me;
    "/brands": Endpoints.get_Catalog_listBrands;
    "/categories": Endpoints.get_Catalog_listCategories;
    "/orders": Endpoints.get_Orders_list;
    "/orders/{id}": Endpoints.get_Orders_get;
    "/products": Endpoints.get_Catalog_listProducts;
    "/products/{slug}": Endpoints.get_Catalog_getProduct;
    "/promos": Endpoints.get_Home_listPromos;
  };
};

// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type PostEndpoints = EndpointByMethod["post"];
export type GetEndpoints = EndpointByMethod["get"];
// </EndpointByMethod.Shorthands>
