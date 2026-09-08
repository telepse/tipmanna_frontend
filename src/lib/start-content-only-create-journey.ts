import type { CreateDialogSignInIntent } from "@/lib/create-dialog-signin-resume";

export type ContentOnlyCreateJourneyInput = {
  /** When true, opens /content-only in a new browser tab (TipLink landing default). */
  openInNewTab?: boolean;
  needsHostAuth: boolean;
  openSignIn: (intent: CreateDialogSignInIntent, href: string) => void;
  navigate: (href: string, options?: { newTab?: boolean }) => void;
};

const CONTENT_ONLY_HREF = "/content-only";

/**
 * Start the content-only wizard without reopening the create type picker.
 * Used by TipLink "Create Yours" and can be shared with create-dialog.
 */
export function startContentOnlyCreateJourney(
  input: ContentOnlyCreateJourneyInput
): void {
  if (input.needsHostAuth) {
    input.openSignIn("type-picker-proceed", CONTENT_ONLY_HREF);
    return;
  }

  if (input.openInNewTab ?? true) {
    input.navigate(CONTENT_ONLY_HREF, { newTab: true });
    return;
  }

  input.navigate(CONTENT_ONLY_HREF);
}
