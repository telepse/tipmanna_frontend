export type CreateDialogSignInIntent =
  | "add-video"
  | "type-picker-proceed"
  | "return-prepared"
  | null;

export type CreateDialogSignInResumeInput = {
  intent: CreateDialogSignInIntent;
  href: string | null;
  hasPendingVideo: boolean;
};

export type CreateDialogSignInResumeResult = {
  closeCreate: boolean;
  navigateTo: string | null;
  keepCreateOpen: boolean;
  refreshHostLink: boolean;
  resumeVideoSubmit: boolean;
};

/**
 * Pure resume decision after modal sign-in from Create dialog.
 * Proceed must never reopen the full picker (no flash before wizard navigation).
 */
export function resolveCreateDialogSignInSuccess(
  input: CreateDialogSignInResumeInput
): CreateDialogSignInResumeResult {
  const { intent, href, hasPendingVideo } = input;

  if (intent === "type-picker-proceed" && href) {
    return {
      closeCreate: true,
      navigateTo: href,
      keepCreateOpen: false,
      refreshHostLink: false,
      resumeVideoSubmit: false,
    };
  }

  if (intent === "return-prepared") {
    return {
      closeCreate: false,
      navigateTo: null,
      keepCreateOpen: true,
      refreshHostLink: true,
      resumeVideoSubmit: false,
    };
  }

  if (intent === "add-video" && hasPendingVideo) {
    return {
      closeCreate: false,
      navigateTo: null,
      keepCreateOpen: true,
      refreshHostLink: false,
      resumeVideoSubmit: true,
    };
  }

  return {
    closeCreate: false,
    navigateTo: null,
    keepCreateOpen: true,
    refreshHostLink: false,
    resumeVideoSubmit: false,
  };
}
