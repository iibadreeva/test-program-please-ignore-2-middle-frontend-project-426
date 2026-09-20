"use client";

import { useState } from "react";
import { cn } from "@/shared/cn";

export const PRODUCT_PLACEHOLDER_SRC = "/product-placeholder.svg";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  testId?: string;
};

/**
 * Renders the placeholder both when a product has no image and when the remote
 * image fails to load, so a broken image is never shown.
 */
export function ProductImage({ src, alt, className, testId }: Props) {
  const [failed, setFailed] = useState(false);
  const isPlaceholder = !src || failed;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={isPlaceholder ? PRODUCT_PLACEHOLDER_SRC : src}
      alt={isPlaceholder ? "Изображение недоступно" : alt}
      className={cn("bg-surface-2 object-cover", className)}
      loading="lazy"
      onError={() => setFailed(true)}
      data-testid={testId}
      data-placeholder={isPlaceholder ? "true" : "false"}
    />
  );
}
