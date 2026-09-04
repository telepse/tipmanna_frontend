function safeInternalPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export function buildVerifyEmailPath(opts: {
  email?: string;
  accountType?: "TIPPER" | "HOST";
  next?: string | null;
}): string {
  const params = new URLSearchParams();
  const email = opts.email?.trim();
  if (email) params.set("email", email);
  if (opts.accountType) params.set("accountType", opts.accountType);
  const next = safeInternalPath(opts.next ?? null);
  if (next) params.set("next", next);
  const qs = params.toString();
  return qs ? `/verify-email?${qs}` : "/verify-email";
}
