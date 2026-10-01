import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const alias = {
  "@": path.resolve(__dirname, "./src"),
  // В Node/Vitest нет условия react-server — иначе server-only бросает при импорте.
  "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts", "prisma/seed/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          globals: true,
          setupFiles: ["./src/test/setup-dom.ts"],
        },
      },
    ],
  },
});
