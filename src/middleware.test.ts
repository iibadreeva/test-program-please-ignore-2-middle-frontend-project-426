import { describe, expect, it } from "vitest";
import { config } from "@/middleware";
import { routes } from "@/shared/routes";

describe("middleware config", () => {
  it("держит matcher в синхроне с routes.account / routes.checkout", () => {
    // Next требует литералы в config.matcher — этот тест ловит дрейф от routes.
    expect(config.matcher).toEqual([
      routes.account,
      `${routes.account}/:path*`,
      routes.checkout,
      `${routes.checkout}/:path*`,
    ]);
  });
});
