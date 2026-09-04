/** Mirror backend baseUsernameFromEmail — strips email prefix to [a-zA-Z0-9_]. */
export function baseUsernameFromEmail(email: string): string {
  const prefix = email.split("@")[0] ?? "";
  return prefix.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}
