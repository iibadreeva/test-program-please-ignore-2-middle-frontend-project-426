import "@typespec/http";
import "@typespec/rest";

using Http;
using Rest;

@service(#{
  title: "HexParts Shop API",
})
@server("http://localhost:3000/api", "Local development")
namespace HexParts;

// --- Models ---

@doc("Денежная сумма в целых рублях (десятичная строка без копеек, без ведущих нулей)")
@pattern("^(0|[1-9][0-9]*)$")
scalar Money extends string;

model ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

model ErrorResponse {
  error: ErrorBody;
}

model UserPublic {
  id: string;
  email: string;
  name: string;
}

model Category {
  id: string;
  slug: string;
  name: string;
}

model Brand {
  id: string;
  slug: string;
  name: string;
}

model ProductSummary {
  id: string;
  slug: string;
  title: string;

  /** Краткое описание для карточки в списке */
  description: string;

  /** Цена в целых рублях */
  @example("16990")
  price: Money;

  oldPrice?: Money;

  /** null означает, что изображения нет — клиент показывает заглушку */
  imageUrl: string | null;

  stock: int32;

  /** Товар доступен к покупке (остаток больше нуля) */
  available: boolean;

  rating: float64;
  category: Category;
  brand: Brand;
}

model ProductDetail extends ProductSummary {
  specs: Record<unknown>;
}

model PaginationMeta {
  page: int32;
  perPage: int32;
  total: int32;
  totalPages: int32;
}

model ProductListResponse {
  items: ProductSummary[];
  meta: PaginationMeta;
}

@doc("Промо-блок главной страницы: текст плюс товар, на который он ведёт")
model PromoBlock {
  id: string;
  title: string;
  text: string;
  /** Товар всегда доступен к покупке: недоступные блоки не отдаются */
  product: ProductSummary;
}

model PickupPoint {
  id: string;
  name: string;
  address: string;
}

model OrderItem {
  id: string;
  productId?: string;
  titleSnapshot: string;
  priceSnapshot: Money;
  imageUrlSnapshot: string;
  quantity: int32;
  lineTotal: Money;
}

model Order {
  id: string;
  status: "NEW" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED";
  deliveryType: "DELIVERY" | "PICKUP";
  address?: string;
  pickupPointId?: string;
  /** Развёрнутый пункт самовывоза; null для доставки или если пункт удалён */
  pickupPoint: PickupPoint | null;
  recipientName: string;
  phone: string;
  comment?: string;
  total: Money;
  createdAt: utcDateTime;
  items: OrderItem[];
}

model RegisterBody {
  @format("email")
  @minLength(1)
  email: string;

  @minLength(8)
  password: string;

  @minLength(2)
  @maxLength(80)
  name?: string;
}

model LoginBody {
  @format("email")
  @minLength(1)
  email: string;

  @minLength(1)
  password: string;
}

model OrderLineInput {
  @minLength(1)
  productId: string;

  /** Количество единиц товара (лимит совпадает с MAX_CART_LINE_QTY на клиенте) */
  @minValue(1)
  @maxValue(99)
  quantity: int32;
}

model CreateOrderBody {
  deliveryType: "DELIVERY" | "PICKUP";
  address?: string;
  pickupPointId?: string;
  recipientName: string;
  phone: string;
  comment?: string;

  /** Состав заказа с клиента (корзина живёт в localStorage); max = MAX_CART_IDS */
  @minItems(1)
  @maxItems(100)
  items: OrderLineInput[];
}

// --- Auth ---

@route("/auth")
@tag("Auth")
interface Auth {
  @post
  @route("/register")
  register(@body body: RegisterBody): {
    @statusCode statusCode: 201;
    @body body: UserPublic;
  } | {
    @statusCode statusCode: 400 | 409;
    @body body: ErrorResponse;
  };

  @post
  @route("/login")
  login(@body body: LoginBody): {
    @statusCode statusCode: 200;
    @body body: UserPublic;
  } | {
    @statusCode statusCode: 401;
    @body body: ErrorResponse;
  };

  @post
  @route("/logout")
  logout(): {
    @statusCode statusCode: 204;
  };

  @get
  @route("/me")
  me(): {
    @statusCode statusCode: 200;
    @body body: UserPublic;
  } | {
    @statusCode statusCode: 401;
    @body body: ErrorResponse;
  };
}

// --- Catalog ---

@tag("Catalog")
interface Catalog {
  @get
  @route("/categories")
  listCategories(): Category[];

  @get
  @route("/brands")
  listBrands(): Brand[];

  @get
  @route("/products")
  listProducts(
    @query category?: string,
    @query brand?: string,
    @query minPrice?: int32,
    @query maxPrice?: int32,

    /** Оставить только доступные товары */
    @query available?: boolean,

    /** Поиск по названию товара */
    @query search?: string,

    @query sort?: "price_asc" | "price_desc" | "rating_desc" | "newest",
    @query page?: int32,
    @query perPage?: int32,
  ): ProductListResponse;

  @get
  @route("/products/{slug}")
  getProduct(@path slug: string): ProductDetail | {
    @statusCode statusCode: 404;
    @body body: ErrorResponse;
  };

  @get
  @route("/pickup-points")
  listPickupPoints(): PickupPoint[];
}

// --- Home ---

@tag("Home")
interface Home {
  @get
  @route("/promos")
  listPromos(): PromoBlock[];
}

// --- Orders ---

@route("/orders")
@tag("Orders")
interface Orders {
  @post
  create(@body body: CreateOrderBody): {
    @statusCode statusCode: 201;
    @body body: Order;
  } | {
    @statusCode statusCode: 400 | 401;
    @body body: ErrorResponse;
  };

  @get
  list(): Order[] | {
    @statusCode statusCode: 401;
    @body body: ErrorResponse;
  };

  @get
  @route("/{id}")
  get(@path id: string): Order | {
    @statusCode statusCode: 401 | 404;
    @body body: ErrorResponse;
  };
}
