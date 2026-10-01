import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "api/tsp-output/**",
      "src/generated/**",
      "next-env.d.ts",
      // Крупные датасеты seed; логика seed-*.ts остаётся под lint.
      "prisma/seed/**/*-data.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*", "@/features", "@/features/*", "@/app", "@/app/*"],
              message: "shared не импортирует server/features/app",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features", "@/features/*", "@/app", "@/app/*"],
              message: "server не импортирует features/app",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/server/repositories",
                "@/server/repositories/*",
                "@/server/services",
                "@/server/services/*",
                "@/features",
                "@/features/*",
              ],
              message: "domain не зависит от repositories/services/features",
            },
          ],
        },
      ],
    },
  },
  {
    // Репозиторий — только Prisma/includes; доменные правила собирает service.
    files: ["src/server/repositories/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/server/domain",
                "@/server/domain/*",
                "@/server/services",
                "@/server/services/*",
                "@/features",
                "@/features/*",
              ],
              message: "repositories не зависят от domain/services/features",
            },
          ],
        },
      ],
    },
  },
  {
    // Клиентские UI-фичи не тянут Prisma/server напрямую (кроме actions).
    // Конвенция: server actions только в `**/actions.ts` (whitelist ниже).
    // Новый `"use server"` файл с другим именем — переименуй или расширь ignores.
    files: ["src/features/**/*.{ts,tsx}"],
    ignores: ["src/features/**/actions.ts", "src/features/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*"],
              message:
                "features UI → только через actions/API; server-only только в **/actions.ts",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/server",
                "@/server/*",
                "@/server/repositories",
                "@/server/repositories/*",
                "@/server/services",
                "@/server/services/*",
                "@/server/auth",
                "@/server/auth/*",
                "@/server/db",
                "@/server/db/*",
                "@prisma/client",
              ],
              message: "components не ходят в server/Prisma — данные через app/layout или features/actions",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
