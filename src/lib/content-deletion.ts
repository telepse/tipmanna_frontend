/**
 * Pure helpers for V2 independent content deletion UI.
 * Soft-delete request lifecycle only — never permanent purge.
 */

import {
  ACCOUNT_DELETION_V2_PATHS,
  assertNoLegacyOrPurgeUrl,
  formatBlockerSummary,
  isSafeOwnRequestId,
  type DeletionBlocker,
  type DeletionCapabilities,
} from "@/lib/account-deletion";

export const CONTENT_DELETION_V2_PATHS = {
  capabilities: ACCOUNT_DELETION_V2_PATHS.capabilities,
  preflight: (type: string, id: string) =>
    `/deletion/content/preflight?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`,
  requests: "/deletion/content/requests",
  requestById: ACCOUNT_DELETION_V2_PATHS.requestById,
  cancel: ACCOUNT_DELETION_V2_PATHS.cancel,
} as const;

export const CONTENT_DELETION_TYPES = [
  "event",
  "channel",
  "tiplink",
  "playlist",
] as const;

export type ContentDeletionType = (typeof CONTENT_DELETION_TYPES)[number];

export type ContentDeletionRequestResult = {
  requestId?: string;
  status?: string;
  reused?: boolean;
  blockers?: DeletionBlocker[];
};

export type ContentDeletionUiPhase =
  | "unavailable"
  | "ready"
  | "blocked"
  | "held"
  | "pending"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed"
  | "error"
  | "not_found";

export function isContentDeletionType(value: string): value is ContentDeletionType {
  return (CONTENT_DELETION_TYPES as readonly string[]).includes(value);
}

export function resolveContentDeletionUiPhase(input: {
  capabilities: DeletionCapabilities | null;
  preflightOk: boolean | null;
  preflightBlockers: DeletionBlocker[];
  requestStatus: string | null;
  hardError: string | null;
  notFound?: boolean;
}): ContentDeletionUiPhase {
  if (input.hardError) return "error";
  if (input.notFound) return "not_found";
  if (
    input.capabilities &&
    input.capabilities.contentDeletionEnabled !== true
  ) {
    return "unavailable";
  }
  if (input.requestStatus) {
    const s = input.requestStatus.toLowerCase();
    if (s === "completed") return "completed";
    if (s === "cancelled") return "cancelled";
    if (s === "failed") return "failed";
    if (s === "blocked") return "blocked";
    if (s === "held") return "held";
    if (s === "processing" || s === "accepted") return "processing";
    if (s === "pending") return "pending";
  }
  if (input.preflightOk === false) {
    const hasBlock = input.preflightBlockers.some(
      (b) => (b.severity || "block") === "block"
    );
    return hasBlock ? "blocked" : "held";
  }
  return "ready";
}

export function contentDeletionExplainers(type: ContentDeletionType): {
  title: string;
  bullets: string[];
} {
  const label =
    type === "tiplink"
      ? "tip link"
      : type === "playlist"
        ? "playlist"
        : type;
  const bullets: string[] = [
    `This requests soft-deletion of this ${label} only — your host account stays active.`,
    "Processing runs in the background with request status you can track and cancel while still cancellable.",
    "Duplicate submissions reuse your existing open request for this content.",
    "Permanent purge is not available. Financial records are not settled or wiped by this action.",
    "You can only delete content you own. Other hosts' content is never accessible here.",
  ];
  if (type === "event") {
    bullets.splice(
      1,
      0,
      "Deleting an event also soft-deletes every channel that belongs to that event. Standalone channel deletion is unnecessary once an event deletion request is pending or completed."
    );
  } else if (type === "channel") {
    bullets.splice(
      1,
      0,
      "This deletes this channel only. If the parent event is already pending or completed for deletion, its channels are covered by that event request — do not expect a separate channel delete to succeed in that case."
    );
  } else if (type === "tiplink") {
    bullets.splice(
      1,
      0,
      "This uses the V2 soft-delete request lifecycle (not the legacy immediate TipLink DELETE). The tip link is archived for product access after processing completes."
    );
  } else if (type === "playlist") {
    bullets.splice(
      1,
      0,
      "This uses the V2 soft-delete request lifecycle (not the legacy immediate playlist DELETE). The playlist is soft-archived after processing completes."
    );
  }
  return {
    title: `Request ${label} deletion`,
    bullets,
  };
}

export function usesOnlyV2ContentDeletionPaths(urls: string[]): boolean {
  return urls.every((url) => {
    try {
      assertNoLegacyOrPurgeUrl(url);
      return (
        url.includes("/deletion/capabilities") ||
        url.includes("/deletion/content/") ||
        /\/deletion\/requests\/[^/]+/.test(url)
      );
    } catch {
      return false;
    }
  });
}

export {
  formatBlockerSummary,
  isSafeOwnRequestId,
  assertNoLegacyOrPurgeUrl,
};
export type { DeletionBlocker, DeletionCapabilities };
