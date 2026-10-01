// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});

/** Старт soft-nav: Sentry + полоса прогресса (href — чтобы не стартовать same-URL). */
export function onRouterTransitionStart(href: string, navigationType: string) {
  Sentry.captureRouterTransitionStart(href, navigationType);
  // Мост ставит app-client копия стора. Без импорта стора в этот entry.
  window.__hexStartNavigationProgress?.(href);
}
