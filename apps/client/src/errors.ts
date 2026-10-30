import type { ValidationError } from "api";

import i18n from "./i18n";

const FIELDS = ["name", "email", "password"] as const;

// The API's own errors (401, 409) already come in the app's language. Its 422 list is
// FastAPI's English, so each entry is replaced with our text for the field it names.
export function errorMessage(error: unknown): string {
  const detail = (error as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const fields = detail.map(
      (e: ValidationError) => FIELDS.find((f) => f === e.loc.at(-1)) ?? "other",
    );
    return [...new Set(fields)]
      .map((f) => i18n.t(`validation.${f}`))
      .join("\n");
  }
  return i18n.t("errors.generic");
}
