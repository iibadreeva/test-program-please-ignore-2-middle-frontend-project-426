import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  AUTH_ME_POLL_MS,
  AUTH_ME_TIMEOUT_MS,
  HEADER_AUTH_CACHE_KEY,
  HeaderAuth,
} from "@/components/header-auth";
import { logoutAction } from "@/features/auth/actions";

const pathnameRef = { current: "/catalog" };

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.current,
}));

vi.mock("@/features/auth/actions", () => ({
  logoutAction: vi.fn(),
}));

const userBody = {
  id: "u1",
  email: "a@example.com",
  name: "Анна Тест",
};

function mockAuthedFetch() {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => userBody,
  } as Response);
}

describe("HeaderAuth", () => {
  beforeEach(() => {
    pathnameRef.current = "/catalog";
    sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({}),
      })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("из sessionStorage сразу показывает пользователя без скелетона", async () => {
    sessionStorage.setItem(
      HEADER_AUTH_CACHE_KEY,
      JSON.stringify({ id: userBody.id, name: userBody.name }),
    );
    mockAuthedFetch();

    render(<HeaderAuth />);

    expect(screen.queryByTestId("nav-auth-skeleton")).toBeNull();
    expect(screen.getByTestId("nav-signout")).toBeTruthy();
    expect(screen.getByTestId("nav-account").textContent).toContain("Анна");

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalled();
    });
  });

  it("после ухода с /login повторно запрашивает /api/auth/me", async () => {
    pathnameRef.current = "/login";
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => userBody,
    } as Response);

    const { rerender } = render(<HeaderAuth />);

    expect(screen.getByTestId("nav-signin")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    pathnameRef.current = "/account";
    rerender(<HeaderAuth />);

    await waitFor(() => {
      expect(screen.getByTestId("nav-signout")).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("nav-account").textContent).toContain("Анна");
    const cached = sessionStorage.getItem(HEADER_AUTH_CACHE_KEY);
    expect(cached).toContain("Анна Тест");
    expect(cached).not.toContain("a@example.com");
    expect(cached).not.toContain("email");
  });

  it("периодически перезапрашивает /api/auth/me, пока вкладка активна", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => userBody,
    } as Response);

    render(<HeaderAuth />);

    await waitFor(() => {
      expect(screen.getByTestId("nav-signout")).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_ME_POLL_MS);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("не дергает /api/auth/me при навигации вне login/register", async () => {
    const fetchMock = vi.mocked(fetch);
    const { rerender } = render(<HeaderAuth />);

    await waitFor(() => {
      expect(screen.getByTestId("nav-signin")).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    pathnameRef.current = "/products/gpu";
    rerender(<HeaderAuth />);
    pathnameRef.current = "/account";
    rerender(<HeaderAuth />);

    await waitFor(() => {
      expect(screen.getByTestId("nav-signin")).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("игнорирует устаревший json после abort при смене epoch", async () => {
    let resolveFirstJson!: (value: unknown) => void;
    const firstJson = new Promise<unknown>((resolve) => {
      resolveFirstJson = resolve;
    });

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => firstJson,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response);

    render(<HeaderAuth />);
    expect(screen.getByTestId("nav-auth-skeleton")).toBeTruthy();

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByTestId("nav-signin")).toBeTruthy();
    });

    await act(async () => {
      resolveFirstJson(userBody);
      await firstJson;
    });

    expect(screen.queryByTestId("nav-signout")).toBeNull();
    expect(screen.getByTestId("nav-signin")).toBeTruthy();
  });

  it("при возврате на вкладку повторно запрашивает /api/auth/me", async () => {
    mockAuthedFetch();
    const fetchMock = vi.mocked(fetch);
    const { rerender } = render(<HeaderAuth />);

    await waitFor(() => {
      expect(screen.getByTestId("nav-signout")).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    pathnameRef.current = "/products/gpu";
    rerender(<HeaderAuth />);
    pathnameRef.current = "/catalog";
    rerender(<HeaderAuth />);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("при ошибке logout восстанавливает пользователя в шапке", async () => {
    mockAuthedFetch();
    vi.mocked(logoutAction).mockRejectedValueOnce(new Error("network"));

    render(<HeaderAuth />);
    await waitFor(() => {
      expect(screen.getByTestId("nav-signout")).toBeTruthy();
    });

    await act(async () => {
      screen.getByTestId("nav-signout").closest("form")!.requestSubmit();
    });

    await waitFor(() => {
      expect(logoutAction).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("nav-signout")).toBeTruthy();
    expect(screen.getByTestId("nav-account").textContent).toContain("Анна");
  });

  it("при 401 сбрасывает кэш и показывает гостя", async () => {
    sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, JSON.stringify(userBody));
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    render(<HeaderAuth />);
    expect(screen.getByTestId("nav-signout")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId("nav-signin")).toBeTruthy();
    });
    expect(sessionStorage.getItem(HEADER_AUTH_CACHE_KEY)).toBeNull();
  });

  it("при сетевой ошибке сохраняет пользователя из кэша", async () => {
    sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, JSON.stringify(userBody));
    vi.mocked(fetch).mockRejectedValue(new Error("network"));

    render(<HeaderAuth />);
    expect(screen.getByTestId("nav-signout")).toBeTruthy();

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalled();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("nav-signout")).toBeTruthy();
    expect(screen.getByTestId("nav-account").textContent).toContain("Анна");
    expect(sessionStorage.getItem(HEADER_AUTH_CACHE_KEY)).toContain("Анна Тест");
  });

  it("при 500 сохраняет пользователя из кэша", async () => {
    sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, JSON.stringify(userBody));
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    render(<HeaderAuth />);
    expect(screen.getByTestId("nav-signout")).toBeTruthy();

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalled();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("nav-signout")).toBeTruthy();
    expect(sessionStorage.getItem(HEADER_AUTH_CACHE_KEY)).toContain("Анна Тест");
  });

  it("после ухода с /login при сбое me делает retry и показывает сессию", async () => {
    pathnameRef.current = "/login";
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => userBody,
      } as Response);

    const { rerender } = render(<HeaderAuth />);

    expect(screen.getByTestId("nav-signin")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    pathnameRef.current = "/account";
    rerender(<HeaderAuth />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByTestId("nav-signout")).toBeTruthy();
    });
    expect(screen.getByTestId("nav-account").textContent).toContain("Анна");
  });

  it("после ухода с /login если retry me тоже падает — не остаётся ложным гостем навсегда без скелетона, в итоге гость", async () => {
    pathnameRef.current = "/login";
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"));

    const { rerender } = render(<HeaderAuth />);

    expect(screen.getByTestId("nav-signin")).toBeTruthy();

    pathnameRef.current = "/account";
    rerender(<HeaderAuth />);

    await waitFor(() => {
      expect(screen.getByTestId("nav-auth-skeleton")).toBeTruthy();
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByTestId("nav-signin")).toBeTruthy();
    });
  });

  it("по timeout /api/auth/me без кэша уходит в гостя, а не зависает на скелетоне", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    render(<HeaderAuth />);
    expect(screen.getByTestId("nav-auth-skeleton")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_ME_TIMEOUT_MS);
    });

    await waitFor(() => {
      expect(screen.getByTestId("nav-signin")).toBeTruthy();
    });
    vi.useRealTimers();
  });

  it("по timeout при известном user из кэша не разлогинивает", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, JSON.stringify(userBody));
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    render(<HeaderAuth />);
    expect(screen.getByTestId("nav-signout")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_ME_TIMEOUT_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("nav-signout")).toBeTruthy();
    expect(sessionStorage.getItem(HEADER_AUTH_CACHE_KEY)).toContain("Анна Тест");
    vi.useRealTimers();
  });

  it("при 200 с невалидным телом не сбрасывает кэш и оставляет пользователя", async () => {
    sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, JSON.stringify(userBody));
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ oops: true }),
    } as Response);

    render(<HeaderAuth />);
    expect(screen.getByTestId("nav-signout")).toBeTruthy();

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalled();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("nav-signout")).toBeTruthy();
    expect(sessionStorage.getItem(HEADER_AUTH_CACHE_KEY)).toContain("Анна Тест");
  });

  it("на /login сбрасывает guest-кэш, чтобы после логина hard-nav не мигал «Войти»", async () => {
    sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, "");
    pathnameRef.current = "/login";
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => userBody,
    } as Response);

    const { rerender } = render(<HeaderAuth />);

    expect(sessionStorage.getItem(HEADER_AUTH_CACHE_KEY)).toBeNull();
    expect(screen.getByTestId("nav-signin")).toBeTruthy();
    // На auth-форме me не дергаем — иначе 200 вернёт «Аккаунт» на /login.
    expect(fetchMock).not.toHaveBeenCalled();

    pathnameRef.current = "/account";
    rerender(<HeaderAuth />);

    await waitFor(() => {
      expect(screen.getByTestId("nav-auth-skeleton")).toBeTruthy();
    });
    expect(screen.queryByTestId("nav-signin")).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId("nav-signout")).toBeTruthy();
    });
  });

  it("на /login с закэшированным user сразу гость, без fetch me", () => {
    sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, JSON.stringify(userBody));
    pathnameRef.current = "/login";
    mockAuthedFetch();

    render(<HeaderAuth />);

    expect(sessionStorage.getItem(HEADER_AUTH_CACHE_KEY)).toBeNull();
    expect(screen.getByTestId("nav-signin")).toBeTruthy();
    expect(screen.queryByTestId("nav-signout")).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("после 401 смена pathname не поднимает user обратно из sessionStorage", async () => {
    sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, JSON.stringify(userBody));
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    const { rerender } = render(<HeaderAuth />);
    expect(screen.getByTestId("nav-signout")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId("nav-signin")).toBeTruthy();
    });
    expect(sessionStorage.getItem(HEADER_AUTH_CACHE_KEY)).toBeNull();

    // Устаревшая запись (другая вкладка / гонка) не должна вернуть UI user при soft-nav.
    sessionStorage.setItem(HEADER_AUTH_CACHE_KEY, JSON.stringify(userBody));
    pathnameRef.current = "/products/gpu";
    rerender(<HeaderAuth />);

    expect(screen.getByTestId("nav-signin")).toBeTruthy();
    expect(screen.queryByTestId("nav-signout")).toBeNull();
  });
});
