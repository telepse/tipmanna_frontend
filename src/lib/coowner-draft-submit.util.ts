import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";

type LinkSlice = {
  ownershipAnswer?: string | null;
  coOwnerDraftKey?: string | null;
};

/** Returns an error message when co-owned videos lack an approved invite. */
export async function validateCoOwnerDraftsForSubmit(
  links: LinkSlice[]
): Promise<string | null> {
  for (const link of links) {
    if (link.ownershipAnswer !== "no") continue;
    const draftKey = link.coOwnerDraftKey?.trim();
    if (!draftKey) {
      return "Co-owner draft id missing — save to draft and try again";
    }
    const res = await getVideoCoOwnerInviteStatusAction(draftKey);
    if (!res.success) {
      return res.message ?? "Could not verify co-owner approval status";
    }
    const invites = (
      res.data as { invites?: { status: string }[] } | null
    )?.invites;
    const hasApproved = invites?.some(i => i.status === "approved") ?? false;
    if (!hasApproved) {
      return "Co-owner must approve the email invite before you can submit";
    }
  }
  return null;
}
