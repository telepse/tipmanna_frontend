import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CONTENT_DELETION_V2_PATHS,
  contentDeletionExplainers,
  isContentDeletionType,
  resolveContentDeletionUiPhase,
  usesOnlyV2ContentDeletionPaths,
} from "@/lib/content-deletion";
import { LEGACY_DELETE_TIPPER_PATH } from "@/lib/account-deletion";

describe("content-deletion helpers", () => {
  it("accepts only supported content types", () => {
    expect(isContentDeletionType("event")).toBe(true);
    expect(isContentDeletionType("channel")).toBe(true);
    expect(isContentDeletionType("message")).toBe(false);
  });

  it("maps unavailable when content capability is off", () => {
    expect(
      resolveContentDeletionUiPhase({
        capabilities: { contentDeletionEnabled: false },
        preflightOk: true,
        preflightBlockers: [],
        requestStatus: null,
        hardError: null,
      })
    ).toBe("unavailable");
  });

  it("maps not_found independently of capabilities", () => {
    expect(
      resolveContentDeletionUiPhase({
        capabilities: { contentDeletionEnabled: true },
        preflightOk: null,
        preflightBlockers: [],
        requestStatus: null,
        hardError: null,
        notFound: true,
      })
    ).toBe("not_found");
  });

  it("maps ready / processing / completed", () => {
    expect(
      resolveContentDeletionUiPhase({
        capabilities: { contentDeletionEnabled: true },
        preflightOk: true,
        preflightBlockers: [],
        requestStatus: null,
        hardError: null,
      })
    ).toBe("ready");
    expect(
      resolveContentDeletionUiPhase({
        capabilities: { contentDeletionEnabled: true },
        preflightOk: true,
        preflightBlockers: [],
        requestStatus: "processing",
        hardError: null,
      })
    ).toBe("processing");
    expect(
      resolveContentDeletionUiPhase({
        capabilities: { contentDeletionEnabled: true },
        preflightOk: true,
        preflightBlockers: [],
        requestStatus: "completed",
        hardError: null,
      })
    ).toBe("completed");
  });

  it("explainers state account is not deleted and purge unavailable", () => {
    const e = contentDeletionExplainers("event");
    expect(e.bullets.join(" ")).toMatch(/account stays active/i);
    expect(e.bullets.join(" ")).toMatch(/Permanent purge is not available/i);
  });

  it("V2 content paths never include legacy tipper delete or purge", () => {
    const id = "77521173-847e-4380-bdb3-5355bf278425";
    const urls = [
      `https://api.example/api/v1${CONTENT_DELETION_V2_PATHS.capabilities}`,
      `https://api.example/api/v1${CONTENT_DELETION_V2_PATHS.preflight("event", id)}`,
      `https://api.example/api/v1${CONTENT_DELETION_V2_PATHS.requests}`,
      `https://api.example/api/v1${CONTENT_DELETION_V2_PATHS.requestById(id)}`,
      `https://api.example/api/v1${CONTENT_DELETION_V2_PATHS.cancel(id)}`,
    ];
    expect(usesOnlyV2ContentDeletionPaths(urls)).toBe(true);
    expect(urls.some((u) => u.includes(LEGACY_DELETE_TIPPER_PATH))).toBe(false);
    expect(urls.some((u) => u.toLowerCase().includes("purge"))).toBe(false);
  });
});

describe("content deletion source contracts", () => {
  it("event Delete button opens V2 dialog (not no-op / not legacy DELETE)", () => {
    const root = resolve(process.cwd(), "src");
    const eventDetail = readFileSync(
      resolve(root, "components/host/event-detail-client.tsx"),
      "utf8"
    );
    expect(eventDetail).toContain("ContentDeleteRequestDialog");
    expect(eventDetail).toContain('contentType="event"');
    expect(eventDetail).not.toMatch(/onClick=\{\(\) => \{\}\}/);
    expect(eventDetail).not.toMatch(/deleteHostEventDetailsAction\s*\(/);
    expect(eventDetail).toContain("setOpenContentDelete(true)");
  });

  it("host settings and tipper menu discover /account/delete", () => {
    const root = resolve(process.cwd(), "src");
    const settings = readFileSync(
      resolve(root, "components/dashboard/settings-client.tsx"),
      "utf8"
    );
    const tipper = readFileSync(
      resolve(root, "components/tipper/tipper-banner.tsx"),
      "utf8"
    );
    expect(settings).toContain('href="/account/delete"');
    expect(settings).toContain("host-account-deletion-nav");
    expect(tipper).toContain('href="/account/delete"');
    expect(tipper).toContain("tipper-account-deletion-nav");
    expect(tipper).not.toMatch(/deleteTipperAction\s*\(/);
  });

  it("content dialog and actions never enable purge", () => {
    const root = resolve(process.cwd(), "src");
    for (const rel of [
      "components/account/content-delete-request-dialog.tsx",
      "actions/deletion.ts",
      "lib/content-deletion.ts",
    ]) {
      const text = readFileSync(resolve(root, rel), "utf8");
      expect(text.toLowerCase()).not.toContain("enable permanent purge");
      expect(text).not.toContain("/auth/delete-tipper");
    }
  });
});
