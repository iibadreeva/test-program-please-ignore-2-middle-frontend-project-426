import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { createElement } from "react";

type MockImageProps = {
  src: string;
  alt: string;
  className?: string;
  onError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
} & Record<string, unknown>;

/** В jsdom нет оптимизатора Next — рендерим обычный img с исходным src. */
vi.mock("next/image", () => ({
  default: function MockNextImage({ src, alt, className, onError, ...rest }: MockImageProps) {
    // next/image-only props не должны попасть в DOM.
    const imgProps = { ...rest };
    delete imgProps.fill;
    delete imgProps.priority;
    delete imgProps.sizes;
    delete imgProps.quality;
    delete imgProps.unoptimized;
    return createElement("img", {
      src,
      alt,
      className,
      onError,
      ...imgProps,
    });
  },
}));

afterEach(() => {
  cleanup();
});
