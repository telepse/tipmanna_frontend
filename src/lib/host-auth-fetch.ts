import {
  AUTH_ERROR_CODES,
  isCohostSessionRequiredError,
  isEmailVerificationRequiredError,
  isHostSessionRequiredError,
} from "@/lib/authorization-policy";

type ErrorBody = {
  error?: {
    message?: string;
    code?: string;
    status?: number;
    details?: { email?: string };
  };
  code?: string;
  message?: string;
  details?: { email?: string };
};

export function parseAuthErrorFromBody(body: unknown): {
  code?: string;
  message?: string;
  email?: string;
} {
  if (!body || typeof body !== "object") return {};
  const b = body as ErrorBody;
  const code = b.error?.code ?? b.code;
  const message = b.error?.message ?? b.message;
  const email = b.error?.details?.email ?? b.details?.email;
  return { code, message, email };
}

export async function parseAuthErrorFromResponse(
  res: Response
): Promise<{ code?: string; message?: string; email?: string }> {
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
  if (isEmailVerificationRequiredError(code)) return null;
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
}): { code?: string; message?: string; email?: string } {
  const fromBody = parseAuthErrorFromBody(result.validationBody);
  if (fromBody.code) return fromBody;
  return { message: result.error ?? result.message ?? undefined };
}

export { isEmailVerificationRequiredError };
