import type { catalog } from "./catalog-data";

/** Промо главной: один товар на блок, в базовом каталоге всегда in-stock. */
type CatalogSlug = (typeof catalog)[number]["slug"];

type PromoBlockSeed = {
  productSlug: CatalogSlug;
  title: string;
  text: string;
  sortOrder: number;
};

export const promoBlocks = [
  {
    productSlug: "rtx-4070-super",
    title: "Игры в 1440p без компромиссов",
    text: "DLSS 3 и запас по трассировке — карта, с которой сборка сразу играет.",
    sortOrder: 0,
  },
  {
    productSlug: "ryzen-7-7800x3d",
    title: "Игровой лидер на 3D V-Cache",
    text: "Максимальный FPS в современных играх без переплаты за лишние ядра.",
    sortOrder: 1,
  },
  {
    productSlug: "samsung-990-pro-1tb",
    title: "Быстрый SSD под систему и игры",
    text: "PCIe 4.0 и терабайт места — загрузка игр перестаёт быть узким местом.",
    sortOrder: 2,
  },
] as const satisfies readonly PromoBlockSeed[];
