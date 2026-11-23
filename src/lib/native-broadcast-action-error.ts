/**
 * Maps Activate-credits / broadcast Server Action failures to host-facing copy.
 * Keeps structured API eligibility messages; softens opaque Next/SW transport errors.
 */
export function formatNativeBroadcastActionError(error: unknown): string {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "action_failed";

  if (
    msg.includes("NO_QUALIFYING_PACK_ORDER") ||
    msg.includes("No paid streaming pack")
  ) {
    return "No paid streaming pack on this host. Complete pack checkout first, then activate credits.";
  }

  if (msg.includes("NO_ACTIVE_SUBSCRIPTION_PERIOD")) {
    return "No active host subscription period for native activation; pack-only hosts use pack activation.";
  }

  if (
    /unexpected response was received from the server/i.test(msg) ||
    /^no-response\b/i.test(msg) ||
    msg.includes("no-response ::")
  ) {
    return "Could not complete activation (browser transport). Refresh the page and try again. If it continues after a paid pack is active, report a service-worker issue.";
  }

  return msg;
}
