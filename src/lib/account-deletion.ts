/**
 * Pure helpers for V2 account deletion UI.
 * Never references legacy /auth/delete-tipper or permanent purge enablement.
 */

export const ACCOUNT_DELETION_V2_PATHS = {
  capabilities: "/deletion/capabilities",
  preflight: "/deletion/account/preflight",
  requests: "/deletion/account/requests",
  requestById: (id: string) => `/deletion/requests/${encodeURIComponent(id)}`,
  cancel: (id: string) =>
    `/deletion/requests/${encodeURIComponent(id)}/cancel`,
} as const;

/** Hard ban — tests assert these never appear in V2 account-delete call paths. */
export const LEGACY_DELETE_TIPPER_PATH = "/auth/delete-tipper";
export const PURGE_FORBIDDEN_SUBSTRINGS = [
  "permanentPurge",
  "PERMANENT_PURGE",
  "/purge",
] as const;

export type DeletionBlocker = {
  code?: string;
  message?: string;
  severity?: "block" | "hold" | string;
};

export type DeletionCapabilities = {
  accountDeletionEnabled?: boolean;
  contentDeletionEnabled?: boolean;
  workerEnabled?: boolean;
  purgeEnabled?: boolean;
  d13SessionRevokeReady?: boolean;
  permanentPurge?: { enabled?: boolean; available?: boolean };
};

export type AccountDeletionRequestResult = {
  requestId?: string;
  status?: string;
  reused?: boolean;
  blockers?: DeletionBlocker[];
};

export type AccountDeletionUiPhase =
  | "unavailable"
  | "ready"
  | "blocked"
  | "held"
  | "pending"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed"
  | "error";

export function resolveAccountDeletionUiPhase(input: {
  capabilities: DeletionCapabilities | null;
  preflightOk: boolean | null;
  preflightBlockers: DeletionBlocker[];
  requestStatus: string | null;
  hardError: string | null;
}): AccountDeletionUiPhase {
  if (input.hardError) return "error";
  if (input.capabilities && input.capabilities.accountDeletionEnabled !== true) {
    return "unavailable";
  }
  if (input.requestStatus) {
    const s = input.requestStatus.toLowerCase();
    if (s === "completed") return "completed";
    if (s === "cancelled") return "cancelled";
    if (s === "failed" || s === "blocked") return s === "blocked" ? "blocked" : "failed";
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

export function formatBlockerSummary(blockers: DeletionBlocker[]): string {
  if (!blockers.length) return "";
  return blockers
    .map((b) => b.message || b.code || "Additional review required")
    .join(" · ");
}

export function assertNoLegacyOrPurgeUrl(url: string): void {
  if (url.includes(LEGACY_DELETE_TIPPER_PATH)) {
    throw new Error("Legacy delete-tipper endpoint is forbidden on V2 path");
  }
  if (url.toLowerCase().includes("/purge")) {
    throw new Error("Purge endpoints are forbidden");
  }
}

export function usesOnlyV2AccountDeletionPaths(urls: string[]): boolean {
  return urls.every((url) => {
    try {
      assertNoLegacyOrPurgeUrl(url);
      return (
        url.includes("/deletion/capabilities") ||
        url.includes("/deletion/account/") ||
        /\/deletion\/requests\/[^/]+/.test(url)
      );
    } catch {
      return false;
    }
  });
}

export function isSafeOwnRequestId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id.trim());
}
