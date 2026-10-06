import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "@server/errors";

const addBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb,
  captureException: vi.fn(),
}));

describe("logAuthRejection", () => {
  beforeEach(() => {
    addBreadcrumb.mockClear();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("CONFLICT → auth.conflict", async () => {
    const { logAuthRejection } = await import("@server/observability/log");
    logAuthRejection(new AuthError("CONFLICT", "Email занят"));
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: "auth.conflict", data: { code: "CONFLICT" } }),
    );
  });

  it("UNAUTHORIZED → auth.unauthorized", async () => {
    const { logAuthRejection } = await import("@server/observability/log");
    logAuthRejection(new AuthError("UNAUTHORIZED", "Неверный email или пароль"));
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "auth.unauthorized",
        data: { code: "UNAUTHORIZED" },
      }),
    );
  });
});
