"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/shared/cn";

export const PRODUCT_PLACEHOLDER_SRC = "/product-placeholder.svg";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  testId?: string;
  /** Для LCP на карточке товара / первых позиций каталога. */
  priority?: boolean;
  /**
   * Подсказка браузеру по ширине слота.
   * Каталог (3 кол.): ~33vw; PDP: половина; корзина: фикс. миниатюра.
   */
  sizes?: string;
};

const DEFAULT_SIZES = "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw";

/**
 * Плейсхолдер и при отсутствии URL, и при ошибке загрузки remote —
 * битая картинка в UI не показывается.
 */
export function ProductImage({
  src,
  alt,
  className,
  testId,
  priority = false,
  sizes = DEFAULT_SIZES,
}: Props) {
  const [failed, setFailed] = useState(false);
  const isPlaceholder = !src || failed;

  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      <Image
        key={isPlaceholder ? "placeholder" : src}
        src={isPlaceholder ? PRODUCT_PLACEHOLDER_SRC : src}
        alt={isPlaceholder ? "Изображение недоступно" : alt}
        fill
        sizes={sizes}
        priority={priority}
        // Локальный svg без оптимизатора: в DOM остаётся /product-placeholder.svg.
        unoptimized={isPlaceholder}
        className="object-cover"
        // onError заставляет next/image присвоить img.src = img.src и сделать src абсолютным.
        onError={isPlaceholder ? undefined : () => setFailed(true)}
        data-testid={testId}
        data-placeholder={isPlaceholder ? "true" : "false"}
      />
    </div>
  );
}
