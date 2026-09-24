import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CatalogFilters } from "@/features/catalog/catalog-filters";

const push = vi.fn();
let currentParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/catalog",
  useSearchParams: () => currentParams,
}));

const categories = [
  { slug: "graphics-cards", name: "Видеокарты" },
  { slug: "processors", name: "Процессоры" },
];
const brands = [{ slug: "nvidia", name: "NVIDIA" }];

function renderFilters(query = "") {
  currentParams = new URLSearchParams(query);
  return render(<CatalogFilters categories={categories} brands={brands} />);
}

const control = <T extends HTMLElement>(testId: string) => screen.getByTestId(testId) as T;

/** Types character by character, the way a debounce would actually be hit. */
function typeInto(input: HTMLElement, value: string) {
  for (let i = 1; i <= value.length; i += 1) {
    fireEvent.change(input, { target: { value: value.slice(0, i) } });
  }
}

const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CatalogFilters — instant feedback", () => {
  it("toggles the availability checkbox within the same click", () => {
    renderFilters();
    const checkbox = control<HTMLInputElement>("filter-available");
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    expect(checkbox.checked).toBe(true);
  });

  it("shows typed characters immediately, before any request goes out", () => {
    renderFilters();
    const search = control<HTMLInputElement>("filter-search");

    typeInto(search, "rtx");

    expect(search.value).toBe("rtx");
    expect(push).not.toHaveBeenCalled();
  });

  it("restores control values from the address", () => {
    renderFilters("search=ryzen&category=processors&minPrice=1000&maxPrice=50000&available=true");

    expect(control<HTMLInputElement>("filter-search").value).toBe("ryzen");
    expect(control<HTMLSelectElement>("filter-category").value).toBe("processors");
    expect(control<HTMLInputElement>("filter-price-min").value).toBe("1000");
    expect(control<HTMLInputElement>("filter-price-max").value).toBe("50000");
    expect(control<HTMLInputElement>("filter-available").checked).toBe(true);
  });
});

describe("CatalogFilters — debounced search", () => {
  it("sends one request for a whole word instead of one per letter", () => {
    renderFilters();

    typeInto(control("filter-search"), "ryzen");
    expect(push).not.toHaveBeenCalled();

    tick(300);

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/catalog?search=ryzen");
  });

  it("drops the queued request when typing continues", () => {
    renderFilters();
    const search = control("filter-search");

    typeInto(search, "ryz");
    tick(200);
    typeInto(search, "ryzen");
    tick(300);

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/catalog?search=ryzen");
  });

  it("debounces the price bounds too", () => {
    renderFilters();

    typeInto(control("filter-price-min"), "5000");
    expect(push).not.toHaveBeenCalled();

    tick(300);

    expect(push).toHaveBeenCalledWith("/catalog?minPrice=5000");
  });
});

describe("CatalogFilters — address as the source of truth", () => {
  it("navigates at once when a select changes", () => {
    renderFilters();

    fireEvent.change(control("filter-category"), { target: { value: "graphics-cards" } });

    expect(push).toHaveBeenCalledWith("/catalog?category=graphics-cards");
  });

  it("combines a new filter with the ones already in the address", () => {
    renderFilters("category=processors");

    fireEvent.click(control("filter-available"));

    expect(push).toHaveBeenCalledWith("/catalog?category=processors&available=true");
  });

  it("returns to the first page when a filter changes", () => {
    renderFilters("category=processors&page=4");

    fireEvent.click(control("filter-available"));

    expect(push).toHaveBeenCalledWith("/catalog?category=processors&available=true");
  });

  it("clears every filter on reset", () => {
    renderFilters("search=ryzen&category=processors&available=true&page=3");

    fireEvent.click(control("filter-reset"));

    expect(push).toHaveBeenCalledWith("/catalog");
    expect(control<HTMLInputElement>("filter-search").value).toBe("");
    expect(control<HTMLSelectElement>("filter-category").value).toBe("");
    expect(control<HTMLInputElement>("filter-available").checked).toBe(false);
  });

  it("does not navigate when the committed value matches the address", () => {
    renderFilters("category=processors");

    fireEvent.change(control("filter-category"), { target: { value: "processors" } });

    expect(push).not.toHaveBeenCalled();
  });
});
