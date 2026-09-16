import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { slug: "graphics-cards", name: "Видеокарты" },
  { slug: "processors", name: "Процессоры" },
  { slug: "motherboards", name: "Материнские платы" },
  { slug: "memory", name: "Память" },
  { slug: "storage", name: "Накопители" },
  { slug: "power-supplies", name: "Блоки питания" },
  { slug: "cases", name: "Корпуса" },
  { slug: "cooling", name: "Охлаждение" },
  { slug: "peripherals", name: "Периферия" },
] as const;

const brands = [
  { slug: "nvidia", name: "NVIDIA" },
  { slug: "amd", name: "AMD" },
  { slug: "intel", name: "Intel" },
  { slug: "asus", name: "ASUS" },
  { slug: "msi", name: "MSI" },
  { slug: "gigabyte", name: "Gigabyte" },
  { slug: "corsair", name: "Corsair" },
  { slug: "kingston", name: "Kingston" },
  { slug: "samsung", name: "Samsung" },
  { slug: "seasonic", name: "Seasonic" },
  { slug: "deepcool", name: "Deepcool" },
  { slug: "logitech", name: "Logitech" },
] as const;

type SeedProduct = {
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  oldPriceCents?: number;
  categorySlug: (typeof categories)[number]["slug"];
  brandSlug: (typeof brands)[number]["slug"];
  stock: number;
  rating: number;
  specs: Prisma.InputJsonValue;
};

function productImage(seed: string): string {
  return `https://placehold.co/640x480/151c27/3dd6c6/png?text=${encodeURIComponent(seed)}`;
}

const catalog: SeedProduct[] = [
  // GPUs
  {
    slug: "rtx-4070-super",
    title: "NVIDIA GeForce RTX 4070 SUPER 12GB",
    description: "Видеокарта для игр в 1440p с DLSS 3 и хорошим запасом по трассировке лучей.",
    priceCents: 6899000,
    oldPriceCents: 7499000,
    categorySlug: "graphics-cards",
    brandSlug: "nvidia",
    stock: 12,
    rating: 4.7,
    specs: { memory: "12 GB GDDR6X", bus: "192-bit", tdp: "220 W" },
  },
  {
    slug: "rx-7800-xt",
    title: "AMD Radeon RX 7800 XT 16GB",
    description: "16 ГБ памяти и сильная растеризация без переплаты за бренд.",
    priceCents: 5599000,
    categorySlug: "graphics-cards",
    brandSlug: "amd",
    stock: 8,
    rating: 4.6,
    specs: { memory: "16 GB GDDR6", bus: "256-bit", tdp: "263 W" },
  },
  {
    slug: "rtx-4060-ti",
    title: "MSI GeForce RTX 4060 Ti Ventus 8GB",
    description: "Компактная карта для Full HD / лёгкого 1440p с поддержкой DLSS.",
    priceCents: 3999000,
    categorySlug: "graphics-cards",
    brandSlug: "msi",
    stock: 20,
    rating: 4.4,
    specs: { memory: "8 GB GDDR6", bus: "128-bit", tdp: "160 W" },
  },
  {
    slug: "rtx-4080-super",
    title: "ASUS GeForce RTX 4080 SUPER TUF 16GB",
    description: "Топовый сегмент для 4K и тяжёлого контента.",
    priceCents: 11999000,
    oldPriceCents: 12999000,
    categorySlug: "graphics-cards",
    brandSlug: "asus",
    stock: 4,
    rating: 4.8,
    specs: { memory: "16 GB GDDR6X", bus: "256-bit", tdp: "320 W" },
  },
  // CPUs
  {
    slug: "ryzen-7-7800x3d",
    title: "AMD Ryzen 7 7800X3D",
    description: "Игровой лидер на 3D V-Cache для максимального FPS.",
    priceCents: 3899000,
    categorySlug: "processors",
    brandSlug: "amd",
    stock: 15,
    rating: 4.9,
    specs: { cores: 8, threads: 16, socket: "AM5", tdp: "120 W" },
  },
  {
    slug: "ryzen-5-7600",
    title: "AMD Ryzen 5 7600",
    description: "Сбалансированный 6-ядерник для игр и повседневных задач.",
    priceCents: 2099000,
    categorySlug: "processors",
    brandSlug: "amd",
    stock: 25,
    rating: 4.6,
    specs: { cores: 6, threads: 12, socket: "AM5", tdp: "65 W" },
  },
  {
    slug: "i5-14600k",
    title: "Intel Core i5-14600K",
    description: "Гибридная архитектура с сильным многопотоком.",
    priceCents: 2799000,
    categorySlug: "processors",
    brandSlug: "intel",
    stock: 18,
    rating: 4.5,
    specs: { cores: 14, threads: 20, socket: "LGA1700", tdp: "125 W" },
  },
  {
    slug: "i7-14700k",
    title: "Intel Core i7-14700K",
    description: "Мощный процессор для стриминга, рендера и тяжёлых сборок.",
    priceCents: 4299000,
    categorySlug: "processors",
    brandSlug: "intel",
    stock: 10,
    rating: 4.7,
    specs: { cores: 20, threads: 28, socket: "LGA1700", tdp: "125 W" },
  },
  // Motherboards
  {
    slug: "asus-b650-tuf",
    title: "ASUS TUF Gaming B650-Plus WiFi",
    description: "Надёжная плата AM5 с Wi-Fi и хорошим питанием VRM.",
    priceCents: 2199000,
    categorySlug: "motherboards",
    brandSlug: "asus",
    stock: 14,
    rating: 4.5,
    specs: { socket: "AM5", chipset: "B650", formFactor: "ATX" },
  },
  {
    slug: "msi-z790-tomahawk",
    title: "MSI MAG Z790 Tomahawk WiFi",
    description: "Плата для Intel 14-го поколения с богатым набором портов.",
    priceCents: 2899000,
    categorySlug: "motherboards",
    brandSlug: "msi",
    stock: 9,
    rating: 4.6,
    specs: { socket: "LGA1700", chipset: "Z790", formFactor: "ATX" },
  },
  {
    slug: "gigabyte-b760m",
    title: "Gigabyte B760M DS3H DDR4",
    description: "Компактная плата micro-ATX для сборок на DDR4.",
    priceCents: 1299000,
    categorySlug: "motherboards",
    brandSlug: "gigabyte",
    stock: 22,
    rating: 4.3,
    specs: { socket: "LGA1700", chipset: "B760", formFactor: "mATX" },
  },
  // Memory
  {
    slug: "corsair-vengence-32-6000",
    title: "Corsair Vengeance 32GB (2x16) DDR5-6000",
    description: "Быстрая память для AM5 и современных платформ.",
    priceCents: 1199000,
    categorySlug: "memory",
    brandSlug: "corsair",
    stock: 30,
    rating: 4.7,
    specs: { capacity: "32 GB", type: "DDR5", speed: "6000 MT/s" },
  },
  {
    slug: "kingston-fury-16-3200",
    title: "Kingston Fury Beast 16GB (2x8) DDR4-3200",
    description: "Надёжный комплект для апгрейда на DDR4.",
    priceCents: 449000,
    categorySlug: "memory",
    brandSlug: "kingston",
    stock: 40,
    rating: 4.5,
    specs: { capacity: "16 GB", type: "DDR4", speed: "3200 MT/s" },
  },
  {
    slug: "corsair-dominator-64-5600",
    title: "Corsair Dominator Platinum 64GB (2x32) DDR5-5600",
    description: "Объёмная память для рабочих станций и монтажа.",
    priceCents: 2899000,
    oldPriceCents: 3199000,
    categorySlug: "memory",
    brandSlug: "corsair",
    stock: 6,
    rating: 4.8,
    specs: { capacity: "64 GB", type: "DDR5", speed: "5600 MT/s" },
  },
  // Storage
  {
    slug: "samsung-990-pro-1tb",
    title: "Samsung 990 PRO 1TB NVMe",
    description: "Быстрый PCIe 4.0 SSD для системы и игр.",
    priceCents: 1099000,
    categorySlug: "storage",
    brandSlug: "samsung",
    stock: 28,
    rating: 4.8,
    specs: { capacity: "1 TB", interface: "PCIe 4.0", form: "M.2 2280" },
  },
  {
    slug: "kingston-nv2-2tb",
    title: "Kingston NV2 2TB NVMe",
    description: "Много места за разумные деньги.",
    priceCents: 1299000,
    categorySlug: "storage",
    brandSlug: "kingston",
    stock: 35,
    rating: 4.4,
    specs: { capacity: "2 TB", interface: "PCIe 4.0", form: "M.2 2280" },
  },
  {
    slug: "samsung-870-evo-1tb",
    title: "Samsung 870 EVO 1TB SATA",
    description: "Классический 2.5\" SSD для апгрейда ноутбука или ПК.",
    priceCents: 799000,
    categorySlug: "storage",
    brandSlug: "samsung",
    stock: 19,
    rating: 4.6,
    specs: { capacity: "1 TB", interface: "SATA III", form: "2.5\"" },
  },
  // PSU
  {
    slug: "seasonic-focus-750",
    title: "Seasonic Focus GX-750 Gold",
    description: "Модульный блок питания 750 Вт с сертификатом 80+ Gold.",
    priceCents: 1399000,
    categorySlug: "power-supplies",
    brandSlug: "seasonic",
    stock: 16,
    rating: 4.8,
    specs: { power: "750 W", efficiency: "80+ Gold", modular: true },
  },
  {
    slug: "corsair-rm850x",
    title: "Corsair RM850x 850W Gold",
    description: "Тихий модульный БП с запасом под мощные GPU.",
    priceCents: 1699000,
    categorySlug: "power-supplies",
    brandSlug: "corsair",
    stock: 11,
    rating: 4.7,
    specs: { power: "850 W", efficiency: "80+ Gold", modular: true },
  },
  {
    slug: "msi-mag-650",
    title: "MSI MAG A650BN 650W Bronze",
    description: "Бюджетный БП для сборок среднего уровня.",
    priceCents: 599000,
    categorySlug: "power-supplies",
    brandSlug: "msi",
    stock: 24,
    rating: 4.2,
    specs: { power: "650 W", efficiency: "80+ Bronze", modular: false },
  },
  // Cases
  {
    slug: "deepcool-cc560",
    title: "Deepcool CC560",
    description: "Просторный Mid-Tower с хорошей вентиляцией.",
    priceCents: 549000,
    categorySlug: "cases",
    brandSlug: "deepcool",
    stock: 17,
    rating: 4.4,
    specs: { formFactor: "Mid-Tower", motherboard: "ATX", temperedGlass: true },
  },
  {
    slug: "corsair-4000d",
    title: "Corsair 4000D Airflow",
    description: "Популярный корпус с упором на воздушный поток.",
    priceCents: 999000,
    categorySlug: "cases",
    brandSlug: "corsair",
    stock: 13,
    rating: 4.7,
    specs: { formFactor: "Mid-Tower", motherboard: "ATX", temperedGlass: true },
  },
  {
    slug: "asus-a21",
    title: "ASUS A21 Micro-ATX",
    description: "Компактный корпус для mATX-сборок.",
    priceCents: 749000,
    categorySlug: "cases",
    brandSlug: "asus",
    stock: 10,
    rating: 4.3,
    specs: { formFactor: "Micro-Tower", motherboard: "mATX", temperedGlass: true },
  },
  // Cooling
  {
    slug: "deepcool-ak620",
    title: "Deepcool AK620",
    description: "Двухбашенный воздушный кулер с отличным охлаждением.",
    priceCents: 599000,
    categorySlug: "cooling",
    brandSlug: "deepcool",
    stock: 21,
    rating: 4.7,
    specs: { type: "Air", tdp: "260 W", fans: 2 },
  },
  {
    slug: "corsair-h100i",
    title: "Corsair iCUE H100i RGB ELITE",
    description: "СЖО 240 мм с RGB и удобным ПО.",
    priceCents: 1399000,
    categorySlug: "cooling",
    brandSlug: "corsair",
    stock: 8,
    rating: 4.5,
    specs: { type: "AIO", radiator: "240 mm", fans: 2 },
  },
  {
    slug: "deepcool-ls720",
    title: "Deepcool LS720 360mm",
    description: "Трёхвентиляторная СЖО для горячих CPU.",
    priceCents: 1199000,
    categorySlug: "cooling",
    brandSlug: "deepcool",
    stock: 7,
    rating: 4.6,
    specs: { type: "AIO", radiator: "360 mm", fans: 3 },
  },
  // Peripherals
  {
    slug: "logitech-g pro-x",
    title: "Logitech G Pro X Superlight",
    description: "Лёгкая беспроводная мышь для киберспорта.",
    priceCents: 1199000,
    categorySlug: "peripherals",
    brandSlug: "logitech",
    stock: 26,
    rating: 4.8,
    specs: { type: "Mouse", wireless: true, weight: "63 g" },
  },
  {
    slug: "logitech-g915",
    title: "Logitech G915 TKL",
    description: "Низкопрофильная беспроводная клавиатура TKL.",
    priceCents: 1899000,
    oldPriceCents: 2099000,
    categorySlug: "peripherals",
    brandSlug: "logitech",
    stock: 9,
    rating: 4.6,
    specs: { type: "Keyboard", wireless: true, form: "TKL" },
  },
  {
    slug: "logitech-g733",
    title: "Logitech G733 Lightspeed",
    description: "Лёгкая игровая гарнитура с RGB.",
    priceCents: 1099000,
    categorySlug: "peripherals",
    brandSlug: "logitech",
    stock: 15,
    rating: 4.5,
    specs: { type: "Headset", wireless: true, surround: true },
  },
  {
    slug: "asus-rog-strix-scope",
    title: "ASUS ROG Strix Scope II 96",
    description: "Механическая клавиатура 96% с хотроупом.",
    priceCents: 1599000,
    categorySlug: "peripherals",
    brandSlug: "asus",
    stock: 11,
    rating: 4.4,
    specs: { type: "Keyboard", wireless: false, form: "96%" },
  },
];

// Expand catalog to ~90+ items with variants
function expandCatalog(base: SeedProduct[]): SeedProduct[] {
  const extras: SeedProduct[] = [];
  const variants = [
    { suffix: "oc", title: " OC", priceMul: 1.08, stockDelta: -3 },
    { suffix: "white", title: " White", priceMul: 1.05, stockDelta: -5 },
  ];

  for (const item of base) {
    for (const v of variants) {
      if (item.categorySlug === "peripherals" && v.suffix === "oc") continue;
      extras.push({
        ...item,
        slug: `${item.slug}-${v.suffix}`,
        title: `${item.title}${v.title}`,
        priceCents: Math.round(item.priceCents * v.priceMul),
        oldPriceCents: item.oldPriceCents
          ? Math.round(item.oldPriceCents * v.priceMul)
          : undefined,
        stock: Math.max(1, item.stock + v.stockDelta),
        rating: Math.min(5, Number((item.rating + 0.05).toFixed(1))),
      });
    }
  }

  return [...base, ...extras];
}

const pickupPoints = [
  { name: "Пункт HexParts · Центр", address: "Москва, Тверская ул., 12" },
  { name: "Пункт HexParts · Юг", address: "Москва, Варшавское шоссе, 95" },
  { name: "Пункт HexParts · Север", address: "Москва, Ленинградский пр-т, 47" },
] as const;

/** Postgres advisory lock so parallel container starts don't race on upserts. */
const SEED_LOCK_KEY = 4_264_260_001;

async function main() {
  console.log("Seeding database (idempotent)...");
  await prisma.$executeRaw`SELECT pg_advisory_lock(${SEED_LOCK_KEY})`;

  try {
    await seedCatalog();
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${SEED_LOCK_KEY})`;
  }
}

async function seedCatalog() {
  const categoryRecords = await Promise.all(
    categories.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        create: c,
        update: { name: c.name },
      }),
    ),
  );
  const brandRecords = await Promise.all(
    brands.map((b) =>
      prisma.brand.upsert({
        where: { slug: b.slug },
        create: b,
        update: { name: b.name },
      }),
    ),
  );

  const categoryBySlug = Object.fromEntries(categoryRecords.map((c) => [c.slug, c.id]));
  const brandBySlug = Object.fromEntries(brandRecords.map((b) => [b.slug, b.id]));

  const products = expandCatalog(catalog);
  const chunkSize = 10;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((p) => {
        const createData = {
          slug: p.slug,
          title: p.title,
          description: p.description,
          priceCents: p.priceCents,
          oldPriceCents: p.oldPriceCents ?? null,
          imageUrl: productImage(p.slug.slice(0, 24)),
          stock: p.stock,
          rating: p.rating,
          specs: p.specs,
          categoryId: categoryBySlug[p.categorySlug],
          brandId: brandBySlug[p.brandSlug],
        };

        // On restart: refresh catalog copy only — do not overwrite stock/price/rating.
        return prisma.product.upsert({
          where: { slug: p.slug },
          create: createData,
          update: {
            title: createData.title,
            description: createData.description,
            imageUrl: createData.imageUrl,
            specs: createData.specs,
            categoryId: createData.categoryId,
            brandId: createData.brandId,
          },
        });
      }),
    );
  }

  await Promise.all(
    pickupPoints.map((point) =>
      prisma.pickupPoint.upsert({
        where: { name: point.name },
        create: point,
        update: { address: point.address },
      }),
    ),
  );

  console.log(
    `Seeded ${categoryRecords.length} categories, ${brandRecords.length} brands, ${products.length} products.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
