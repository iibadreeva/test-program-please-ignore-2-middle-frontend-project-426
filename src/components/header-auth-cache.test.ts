import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HEADER_AUTH_CACHE_KEY,
  readCachedUser,
  writeCachedUser,
} from "@/components/header-auth-cache";

const user = {
  id: "u1",
  email: "secret@example.com",
  name: "Анна Тест",
};

describe("header-auth-cache", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("не пишет email в sessionStorage", () => {
    writeCachedUser(user);

    const raw = sessionStorage.getItem(HEADER_AUTH_CACHE_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain("secret@example.com");
    expect(raw).not.toContain("email");
    expect(JSON.parse(raw!)).toEqual({ id: "u1", name: "Анна Тест" });
  });

  it("читает снимок без email и отдаёт PublicUser-совместимый объект", () => {
    sessionStorage.setItem(
      HEADER_AUTH_CACHE_KEY,
      JSON.stringify({ id: "u1", name: "Анна Тест" }),
    );

    expect(readCachedUser()).toEqual({
      id: "u1",
      name: "Анна Тест",
      email: "",
    });
  });

  it("игнорирует legacy-запись с email (ключ/формат сменились)", () => {
    sessionStorage.setItem("shop:header-auth:v1", JSON.stringify(user));
    expect(readCachedUser()).toBeUndefined();
  });
});
