import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";
import {
  coOwnerBlockReasonMessage,
  evaluateCoOwnerSubmitReadiness,
} from "@/lib/coowner-submit-readiness.util";

export {
  coOwnerBlockReasonMessage,
  evaluateCoOwnerSubmitReadiness,
  type CoOwnerBlockReason,
  type CoOwnerSubmitReadiness,
} from "@/lib/coowner-submit-readiness.util";

type LinkSlice = {
  ownershipAnswer?: string | null;
  coOwnerDraftKey?: string | null;
  isDefault?: boolean;
};

/** Returns an error message when co-owned videos lack an approved invite. */
export async function validateCoOwnerDraftsForSubmit(
  links: LinkSlice[]
): Promise<string | null> {
  for (const link of links) {
    if (link.ownershipAnswer !== "no") continue;

    const draftKey = link.coOwnerDraftKey?.trim();
    if (!draftKey) {
      return coOwnerBlockReasonMessage("missing_draft_key");
    }

    const res = await getVideoCoOwnerInviteStatusAction(draftKey);
    if (!res.success) {
      return res.message ?? coOwnerBlockReasonMessage("status_fetch_failed");
    }

    const invites = (res.data as { invites?: { status: string }[] } | null)
      ?.invites;
    const readiness = evaluateCoOwnerSubmitReadiness(invites);
    if (readiness.blocked) {
      if (
        link.isDefault &&
        (readiness.reason === "has_pending" ||
          readiness.reason === "missing_approved")
      ) {
        return coOwnerBlockReasonMessage("default_awaiting_approval");
      }
      if (readiness.reason) {
        return coOwnerBlockReasonMessage(readiness.reason);
      }
    }
  }
  return null;
}
