import {
  AUTH_ERROR_CODES,
  isCohostSessionRequiredError,
  isHostSessionRequiredError,
} from "@/lib/authorization-policy";

type ErrorBody = {
  error?: { message?: string; code?: string; status?: number };
  code?: string;
  message?: string;
};

export function parseAuthErrorFromBody(body: unknown): {
  code?: string;
  message?: string;
} {
  if (!body || typeof body !== "object") return {};
  const b = body as ErrorBody;
  const code = b.error?.code ?? b.code;
  const message = b.error?.message ?? b.message;
  return { code, message };
}

export async function parseAuthErrorFromResponse(
  res: Response
): Promise<{ code?: string; message?: string }> {
  try {
    const body = await res.clone().json();
    return parseAuthErrorFromBody(body);
  } catch {
    return {};
  }
}

export function isAuthSessionRequired(
  code?: string | null,
  message?: string | null
): "host" | "cohost" | null {
  if (isHostSessionRequiredError(message, code)) return "host";
  if (isCohostSessionRequiredError(message, code)) return "cohost";
  if (code === AUTH_ERROR_CODES.HOST_SESSION_REQUIRED) return "host";
  if (code === AUTH_ERROR_CODES.COHOST_SESSION_REQUIRED) return "cohost";
  return null;
}

export function authErrorCodeFromActionResult(result: {
  error?: string | null;
  message?: string | null;
  validationBody?: unknown;
}): { code?: string; message?: string } {
  const fromBody = parseAuthErrorFromBody(result.validationBody);
  if (fromBody.code) return fromBody;
  return { message: result.error ?? result.message ?? undefined };
}
