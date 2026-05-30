import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "react-toastify";

export type ServerFieldError = {
  path?: string;
  message: string;
};

export type ServerValidationPayload = {
  message?: string;
  errors?: ServerFieldError[];
  details?: ServerFieldError[];
};

/** Normalize backend validation bodies into field errors. */
export function parseServerValidationErrors(body: unknown): ServerFieldError[] {
  if (!body || typeof body !== "object") return [];
  const o = body as ServerValidationPayload & {
    error?: { message?: string; details?: ServerFieldError[] };
  };
  const fromErrors = Array.isArray(o.errors) ? o.errors : [];
  const fromDetails = Array.isArray(o.details) ? o.details : [];
  const nested = Array.isArray(o.error?.details) ? o.error.details : [];
  return [...fromErrors, ...fromDetails, ...nested].filter(
    e => e && typeof e.message === "string" && e.message.trim()
  );
}

/** Apply server field errors to a react-hook-form instance and toast a summary. */
export function applyServerFormErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  body: unknown,
  fallbackMessage = "Please fix the highlighted fields"
): boolean {
  const rows = parseServerValidationErrors(body);
  if (rows.length === 0) {
    let msg = fallbackMessage;
    if (
      body &&
      typeof body === "object" &&
      body !== null &&
      "message" in body
    ) {
      const raw = (body as { message?: string }).message;
      if (typeof raw === "string" && raw.trim()) msg = raw;
    }
    toast.error(msg);
    return false;
  }

  rows.forEach(row => {
    const path = (row.path ?? "").trim();
    if (!path) return;
    form.setError(path as Path<T>, { type: "server", message: row.message });
  });

  const firstPath = rows.find(r => r.path?.trim())?.path?.trim();
  if (firstPath && typeof document !== "undefined") {
    const el = document.querySelector(`[name="${firstPath}"]`);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  toast.error(rows[0]?.message ?? fallbackMessage);
  return true;
}
