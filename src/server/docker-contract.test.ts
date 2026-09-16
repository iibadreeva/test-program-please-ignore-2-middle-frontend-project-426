import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("docker seed contract", () => {
  it("builds seed as CommonJS so NODE_PATH resolves @prisma/client", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const script = pkg.scripts["seed:build"] ?? "";
    expect(script).toMatch(/--format=cjs/);
    expect(script).toMatch(/dist\/seed\.cjs/);
    expect(script).not.toMatch(/seed\.mjs/);
  });

  it("entrypoint runs seed.cjs with NODE_PATH and retries migrate", () => {
    const entry = readFileSync(path.join(root, "docker-entrypoint.sh"), "utf8");
    expect(entry).toMatch(/dist\/seed\.cjs/);
    expect(entry).toMatch(/NODE_PATH=\/prisma-tools\/node_modules/);
    expect(entry).not.toMatch(/seed\.mjs/);
    expect(entry).toMatch(/migrate deploy/);
    expect(entry).toMatch(/retry|attempt|sleep/i);
  });
});
