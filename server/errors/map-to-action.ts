import "server-only";

import {
  classifyDomainError,
  fieldErrorsFromDetails,
} from "@server/errors/classify";
import { logAuthRejection } from "@server/observability/log";
import { reportUnexpectedError } from "@server/observability/report";
import type { OrderProblemItem } from "@/shared/api-contract";

/** Общий shape ошибки для server actions (form state). */
export type ActionFailResult = {
  ok: false;
  message: string;
  problems?: OrderProblemItem[];
  fieldErrors?: Record<string, string[] | undefined>;
};

/**
 * Единый маппер доменных/валидационных ошибок → form state.
 * Классификация общая с HTTP (`classifyDomainError`), без status-кодов.
 */
export function mapDomainErrorToActionResult(
  error: unknown,
  fallbackMessage: string,
): ActionFailResult {
  const classified = classifyDomainError(error);

  switch (classified.kind) {
    case "auth":
      logAuthRejection(classified.error);
      return { ok: false, message: classified.error.message };
    case "order_items_unavailable":
      return {
        ok: false,
        message: classified.error.message,
        problems: classified.error.problems,
      };
    case "order":
      return { ok: false, message: classified.error.message };
    case "domain_client": {
      // details наружу только для VALIDATION_ERROR (fieldErrors для форм).
      if (classified.code === "VALIDATION_ERROR") {
        const fieldErrors = fieldErrorsFromDetails(classified.error.details);
        return fieldErrors
          ? {
              ok: false,
              message: classified.error.message,
              fieldErrors,
            }
          : { ok: false, message: classified.error.message };
      }
      return { ok: false, message: classified.error.message };
    }
    case "domain_internal":
      reportUnexpectedError(classified.error);
      return { ok: false, message: fallbackMessage };
    case "zod":
      return {
        ok: false,
        message: "Проверьте поля формы",
        fieldErrors: classified.error.flatten().fieldErrors,
      };
    case "unknown":
      reportUnexpectedError(classified.error);
      return { ok: false, message: fallbackMessage };
  }
}
