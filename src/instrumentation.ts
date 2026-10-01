import * as Sentry from "@sentry/nextjs";
import { isCookieSecure } from "@/shared/cookie-secure";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    // Secure-cookie не включаем по NODE_ENV: Hexlet/docker часто HTTP + production.
    // На HTTPS-хостинге нужно явно задать COOKIE_SECURE=true.
    if (process.env.NODE_ENV === "production" && !isCookieSecure()) {
      console.warn(
        "[auth] COOKIE_SECURE не задан: session-cookie без Secure. На HTTPS (Render) задайте COOKIE_SECURE=true.",
      );
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
