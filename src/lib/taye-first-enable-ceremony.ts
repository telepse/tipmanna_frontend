export const TAYE_FIRST_ENABLE_CONFIRM_MESSAGE =
  "Turn TAYE on? Existing guests will start seeing enrollment gating for this room.";

export type TayeCeremonyEventMeta = {
  direction?: string | null;
  partnerReturnedEventId?: string | null;
};

export function isOutboundPublishedForCeremony(
  meta: TayeCeremonyEventMeta | null | undefined,
  publishedPartnerEventId: string | null | undefined
): boolean {
  return Boolean(
    publishedPartnerEventId?.trim() || meta?.partnerReturnedEventId?.trim()
  );
}

/**
 * First OFF→ON transition after outbound publish (or on outbound rows) must confirm
 * before calling the activation API. Does not require direction to be refreshed yet.
 */
export function requiresTayeFirstEnableConfirmation(
  currentlyActive: boolean,
  turningOn: boolean,
  meta: TayeCeremonyEventMeta | null | undefined,
  publishedPartnerEventId: string | null | undefined
): boolean {
  if (!turningOn || currentlyActive) return false;
  const outboundPublished = isOutboundPublishedForCeremony(
    meta,
    publishedPartnerEventId
  );
  if (outboundPublished) return true;
  return meta?.direction === "tipmanna_outbound";
}

export async function applyTayeActiveWithCeremony(params: {
  next: boolean;
  currentlyActive: boolean;
  meta: TayeCeremonyEventMeta | null | undefined;
  publishedPartnerEventId: string | null | undefined;
  confirm: (message: string) => boolean;
  activate: (next: boolean) => Promise<boolean>;
}): Promise<{ applied: boolean; userConfirmed: boolean }> {
  const needsConfirm = requiresTayeFirstEnableConfirmation(
    params.currentlyActive,
    params.next,
    params.meta,
    params.publishedPartnerEventId
  );
  if (needsConfirm && !params.confirm(TAYE_FIRST_ENABLE_CONFIRM_MESSAGE)) {
    return { applied: false, userConfirmed: false };
  }
  const applied = await params.activate(params.next);
  return { applied, userConfirmed: !needsConfirm || true };
}
