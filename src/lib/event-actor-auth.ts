/**
 * Pure event-actor bearer selection (host vs cohost vs primary).
 * Tokens stay server-side; this module only compares presence and event scope.
 */

export type EventActorCohostSession = {
  token: string;
  eventId: string | null;
  active: boolean;
};

export type EventActorAuthInput = {
  eventId?: string;
  /** Host dashboard / explicit owner surface — hostToken before scoped cohost. */
  preferHostSession?: boolean;
  cohost: EventActorCohostSession | null;
  hostToken: string | null;
  primaryToken: string | null;
};

function scopedCohostToken(
  eventId: string | undefined,
  cohost: EventActorCohostSession | null
): string | null {
  if (!cohost?.active || !cohost.token.trim()) return null;
  const scopedEventId = eventId?.trim();
  if (!scopedEventId) return cohost.token.trim();
  if (cohost.eventId?.trim() === scopedEventId) return cohost.token.trim();
  return null;
}

/** Pick Authorization bearer for an event-scoped mutation (no token logging). */
export function selectEventActorBearer(input: EventActorAuthInput): string | null {
  const host = input.hostToken?.trim() || null;
  const primary = input.primaryToken?.trim() || null;
  const cohostForEvent = scopedCohostToken(input.eventId, input.cohost);
  const cohostLegacy =
    !input.eventId?.trim() && input.cohost?.active && input.cohost.token.trim()
      ? input.cohost.token.trim()
      : null;

  const order: Array<string | null> = input.preferHostSession
    ? [host, cohostForEvent, cohostLegacy, primary]
    : [cohostForEvent, cohostLegacy, host, primary];

  for (const candidate of order) {
    if (candidate) return candidate;
  }
  return null;
}
