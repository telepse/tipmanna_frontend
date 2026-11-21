/**
 * Classify broadcast/status poll failures for host Advanced Studio surfaces.
 * Keeps ownership denials explicit so wrong-fixture / wrong-host sessions are
 * not mistaken for a transient network blip.
 */

export function isEventOwnershipDeniedMessage(
  message: string | null | undefined,
  httpStatus?: number | null
): boolean {
  if (httpStatus === 403 && message) {
    return /not authorized for this event/i.test(message);
  }
  if (!message) return false;
  return /not authorized for this event/i.test(message);
}

export function formatEventOwnershipDeniedMessage(input: {
  hostSlug: string;
  eventId: string;
}): string {
  return (
    `Not authorized for this event. The signed-in host cannot operate ` +
    `event ${input.eventId} under /host/${input.hostSlug}/broadcast/. ` +
    `Sign in as the event owner host for this URL (Finish B restore fixture ` +
    `only — do not use the legacy frontend-wt-b1-finish-b seed).`
  );
}
