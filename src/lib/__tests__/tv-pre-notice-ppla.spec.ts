import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("enforced-program starting notice — PPLA dismiss", () => {
  const providerSource = readFileSync(
    join(repoRoot, "src/components/tv-provider.tsx"),
    "utf8"
  );

  it("Test 1 — PPLA dismiss clears post-payment axis before snapshot restore", () => {
    const restore = providerSource.match(
      /const restorePreNoticeLocal = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[\n    localPreNoticeSnapshot,/
    )?.[0];
    expect(restore).toBeTruthy();
    expect(restore!).toMatch(
      /if \(postPaymentAxisRef\.current\) \{\s*clearPostPaymentLiveAxis\("pre_notice_dismiss"\);/
    );
    expect(restore!).toContain("dismissPreNotice(snap.enforcementId)");
    expect(restore!).toContain("player.seekTo(snap.seekSeconds, false)");
    expect(restore!).not.toContain("enterGlobalMode");
  });

  it("Test 2 — PPLA wait-out still uses enterGlobalMode (clears PPLA)", () => {
    expect(providerSource).toContain(
      'clearPostPaymentLiveAxis("enter_global_mode")'
    );
    const waitOut = providerSource.match(
      /if \(prevEnfId && enfId !== prevEnfId\) \{[\s\S]*?enterGlobalMode\(\);/
    )?.[0];
    expect(waitOut).toBeTruthy();
    expect(waitOut!).toContain('modeRef.current === "LOCAL"');
  });
});

describe("enforced-program starting notice — LOCAL and GLOBAL (unchanged)", () => {
  const looperSource = readFileSync(
    join(repoRoot, "src/components/tv/tv-looper.tsx"),
    "utf8"
  );
  const overlaySource = readFileSync(
    join(repoRoot, "src/components/tv/enforcement-pre-notice-overlay.tsx"),
    "utf8"
  );

  it("Test 3 — LOCAL overlay offers return; wait-out path preserved in provider", () => {
    expect(looperSource).toMatch(
      /onReturnToLocal=\{\s*mode === "LOCAL" && localPreNoticeSnapshot\s*\?\s*restorePreNoticeLocal/
    );
    const providerSource = readFileSync(
      join(repoRoot, "src/components/tv-provider.tsx"),
      "utf8"
    );
    expect(providerSource).toContain("restorePreNoticeLocal");
    expect(providerSource).toMatch(/enterGlobalMode\(\);\s*\n\s*\}/);
  });

  it("Test 4 — GLOBAL shows notice without dismiss button", () => {
    expect(looperSource).toContain('mode === "GLOBAL" && isPreNotice');
    expect(looperSource).toMatch(
      /onReturnToLocal=\{\s*mode === "LOCAL" && localPreNoticeSnapshot[\s\S]*?: undefined/
    );
    expect(overlaySource).toContain("onReturnToLocal ?");
    expect(overlaySource).toContain("Program starts on Live TV in");
  });
});
