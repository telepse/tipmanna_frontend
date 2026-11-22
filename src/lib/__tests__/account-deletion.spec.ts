import { describe, expect, it } from "vitest";

import {
  ACCOUNT_DELETION_V2_PATHS,
  LEGACY_DELETE_TIPPER_PATH,
  assertNoLegacyOrPurgeUrl,
  formatBlockerSummary,
  isSafeOwnRequestId,
  resolveAccountDeletionUiPhase,
  usesOnlyV2AccountDeletionPaths,
} from "@/lib/account-deletion";

describe("account-deletion helpers", () => {
  it("maps unavailable when capability flag is off", () => {
    expect(
      resolveAccountDeletionUiPhase({
        capabilities: { accountDeletionEnabled: false },
        preflightOk: true,
        preflightBlockers: [],
        requestStatus: null,
        hardError: null,
      })
    ).toBe("unavailable");
  });

  it("maps financial/co-owner preflight block", () => {
    expect(
      resolveAccountDeletionUiPhase({
        capabilities: { accountDeletionEnabled: true },
        preflightOk: false,
        preflightBlockers: [
          {
            code: "OUTSTANDING_HOST_OBLIGATIONS",
            message: "Outstanding host obligations",
            severity: "block",
          },
        ],
        requestStatus: null,
        hardError: null,
      })
    ).toBe("blocked");
  });

  it("maps ready when enabled and preflight ok", () => {
    expect(
      resolveAccountDeletionUiPhase({
        capabilities: { accountDeletionEnabled: true },
        preflightOk: true,
        preflightBlockers: [],
        requestStatus: null,
        hardError: null,
      })
    ).toBe("ready");
  });

  it("maps request lifecycle statuses", () => {
    expect(
      resolveAccountDeletionUiPhase({
        capabilities: { accountDeletionEnabled: true },
        preflightOk: true,
        preflightBlockers: [],
        requestStatus: "processing",
        hardError: null,
      })
    ).toBe("processing");
    expect(
      resolveAccountDeletionUiPhase({
        capabilities: { accountDeletionEnabled: true },
        preflightOk: true,
        preflightBlockers: [],
        requestStatus: "completed",
        hardError: null,
      })
    ).toBe("completed");
  });

  it("formats blocker summary for confirmation UI", () => {
    expect(
      formatBlockerSummary([
        { code: "CO_OWNER_OUTSTANDING", message: "Co-owner debt" },
        { code: "WALLET_BALANCE_POSITIVE" },
      ])
    ).toContain("Co-owner debt");
  });

  it("accepts only uuid-shaped own request ids", () => {
    expect(isSafeOwnRequestId("77521173-847e-4380-bdb3-5355bf278425")).toBe(
      true
    );
    expect(isSafeOwnRequestId("../etc/passwd")).toBe(false);
    expect(isSafeOwnRequestId("")).toBe(false);
  });

  it("forbids legacy delete-tipper and purge URLs", () => {
    expect(() =>
      assertNoLegacyOrPurgeUrl(
        `https://api.example/api/v1${LEGACY_DELETE_TIPPER_PATH}`
      )
    ).toThrow(/Legacy/);
    expect(() =>
      assertNoLegacyOrPurgeUrl("https://api.example/api/v1/deletion/purge")
    ).toThrow(/Purge/);
  });

  it("V2 path constants never include legacy tipper delete", () => {
    const urls = [
      `https://tipmanna-staging.onrender.com/api/v1${ACCOUNT_DELETION_V2_PATHS.capabilities}`,
      `https://tipmanna-staging.onrender.com/api/v1${ACCOUNT_DELETION_V2_PATHS.preflight}`,
      `https://tipmanna-staging.onrender.com/api/v1${ACCOUNT_DELETION_V2_PATHS.requests}`,
      `https://tipmanna-staging.onrender.com/api/v1${ACCOUNT_DELETION_V2_PATHS.requestById("77521173-847e-4380-bdb3-5355bf278425")}`,
      `https://tipmanna-staging.onrender.com/api/v1${ACCOUNT_DELETION_V2_PATHS.cancel("77521173-847e-4380-bdb3-5355bf278425")}`,
    ];
    expect(usesOnlyV2AccountDeletionPaths(urls)).toBe(true);
    expect(urls.some((u) => u.includes(LEGACY_DELETE_TIPPER_PATH))).toBe(false);
    expect(urls.some((u) => u.includes("permanentPurge"))).toBe(false);
  });
});

describe("account delete source contract", () => {
  it("V2 account-delete call sites never invoke legacy delete-tipper", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const root = resolve(process.cwd(), "src");
    const callSites = [
      "actions/deletion.ts",
      "components/account/account-delete-client.tsx",
      "app/account/delete/page.tsx",
    ];
    for (const rel of callSites) {
      const text = readFileSync(resolve(root, rel), "utf8");
      expect(text).not.toContain("delete-tipper");
      expect(text).not.toContain("deleteTipperAction");
      expect(text.toLowerCase()).not.toContain("enable permanent purge");
    }
    const helpers = readFileSync(resolve(root, "lib/account-deletion.ts"), "utf8");
    expect(helpers).toContain('LEGACY_DELETE_TIPPER_PATH = "/auth/delete-tipper"');
    expect(helpers).toMatch(/forbidden on V2 path/);
  });
});
