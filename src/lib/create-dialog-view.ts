import type { HostCapability } from "@/hooks/use-host-capability";

export type CreateDialogView =
  | "loading"
  | "summarized-picker"
  | "prepared"
  | "full-picker";

export type ResolveCreateDialogViewInput = {
  openPopup: boolean;
  communityFeatureOn: boolean;
  userId: string | undefined;
  userRole: string | undefined;
  capabilityStatus: HostCapability["status"];
  sessionLoading: boolean;
  pickerLoading: boolean;
  canReadAsHost: boolean;
  showNewEventRoomPicker: boolean;
};

/**
 * Pure view resolver for CreateDialog. Signed-in non-visitors with community
 * enabled never see full-picker until host linkage has settled to "none".
 */
export function resolveCreateDialogView(
  input: ResolveCreateDialogViewInput
): CreateDialogView {
  const {
    openPopup,
    communityFeatureOn,
    userId,
    userRole,
    capabilityStatus,
    sessionLoading,
    pickerLoading,
    canReadAsHost,
    showNewEventRoomPicker,
  } = input;

  if (!openPopup) {
    return "full-picker";
  }

  if (!communityFeatureOn) {
    return "full-picker";
  }

  const isSignedInNonVisitor = Boolean(userId) && userRole !== "VISITOR";

  if (isSignedInNonVisitor) {
    const linkageUnsettled = capabilityStatus === "loading" || sessionLoading;

    if (linkageUnsettled) {
      return "loading";
    }

    if (showNewEventRoomPicker) {
      return "summarized-picker";
    }

    if (canReadAsHost && pickerLoading) {
      return "loading";
    }

    if (canReadAsHost) {
      return "prepared";
    }
  }

  if (showNewEventRoomPicker) {
    return "summarized-picker";
  }

  return "full-picker";
}
