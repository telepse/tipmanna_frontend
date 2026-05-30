/**
 * Safe fetch + JSON for Next.js server actions.
 * Never throws; returns { data, error, success, message } for backward compatibility.
 */

/** Next.js extends fetch RequestInit — keep explicit for server-action caching */
export type ServerActionFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export type ActionResult<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
  /** Alias of error when failed — legacy callers */
  message?: string;
  /** Raw error JSON body for field-level validation mapping */
  validationBody?: unknown;
};

export function actionOk<T>(data: T): ActionResult<T> {
  return { data, error: null, success: true };
}

export function actionFail<T = never>(
  message: string,
  logContext?: string
): ActionResult<T> {
  console.error(`[ServerAction${logContext ? `:${logContext}` : ""}]`, message);
  return {
    data: null,
    error: message,
    success: false,
    message,
  };
}

function errorMessageFromBody(raw: unknown, fallback: string): string {
  if (raw && typeof raw === "object" && raw !== null && "error" in raw) {
    const err = (raw as { error?: { message?: string } }).error;
    if (typeof err?.message === "string" && err.message) return err.message;
  }
  if (raw && typeof raw === "object" && raw !== null && "message" in raw) {
    const m = (raw as { message?: string }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

/**
 * Fetch JSON from backend; never throws.
 */
export async function runServerFetch<T = unknown>(
  url: string,
  init: ServerActionFetchInit | undefined,
  context: string,
  mapSuccess?: (raw: unknown) => T
): Promise<ActionResult<T>> {
  try {
    const res = await fetch(url, init as RequestInit);
    const text = await res.text();
    let raw: unknown = null;
    if (text) {
      try {
        raw = JSON.parse(text) as unknown;
      } catch {
        return actionFail<T>(
          "Server returned invalid JSON",
          `${context} status=${res.status}`
        );
      }
    }

    if (!res.ok) {
      const msg = errorMessageFromBody(raw, `Request failed (${res.status})`);
      return { ...actionFail<T>(msg, context), validationBody: raw };
    }

    const data = (mapSuccess ? mapSuccess(raw) : raw) as T;
    return actionOk(data);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Network error — check your connection";
    return actionFail<T>(msg, context);
  }
}
