/**
 * Server-side backend base URL for server actions and RSC.
 * Runtime `BACKEND_API_URL` supports local/disposable stacks without rebaking NEXT_PUBLIC_*.
 * Client bundles still require NEXT_PUBLIC_BACKEND_API_URL at build time.
 */
export function resolveServerBackendApiBase(): string | null {
  const raw =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    "";
  if (!raw || raw === "undefined" || raw === "null") return null;
  return raw.replace(/\/$/, "");
}

export const BACKEND_API_URL_NOT_CONFIGURED =
  "NEXT_PUBLIC_BACKEND_API_URL is not configured";

export function isMalformedBackendActionUrl(url: string): boolean {
  return (
    !url ||
    url.startsWith("undefined") ||
    url.startsWith("null") ||
    url.includes("/undefined/") ||
    url.includes("/null/")
  );
}
