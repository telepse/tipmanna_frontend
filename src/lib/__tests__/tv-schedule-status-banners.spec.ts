import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("TV schedule status banners", () => {
  const bannerSource = readFileSync(
    join(repoRoot, "components/tv/tv-schedule-status-banners.tsx"),
    "utf8"
  );
  const shellSource = readFileSync(
    join(repoRoot, "components/tv/tv-interactive-shell.tsx"),
    "utf8"
  );

  it("shows schedule error copy when schedule fails before tvReady", () => {
    expect(bannerSource).toContain("scheduleError && !tvReady");
    expect(bannerSource).toContain("Unable to load the TV schedule");
    expect(bannerSource).toContain('data-testid="tv-schedule-error-banner"');
  });

  it("Retry calls retryScheduleLoad", () => {
    expect(bannerSource).toContain("onClick={() => retryScheduleLoad()}");
    expect(bannerSource).toContain('data-testid="tv-schedule-error-retry"');
  });

  it("represents stale cache when tvReady", () => {
    expect(bannerSource).toContain("scheduleStale && tvReady");
    expect(bannerSource).toContain("Using a cached TV schedule");
    expect(bannerSource).toContain('data-testid="tv-schedule-stale-banner"');
  });

  it("shell mounts schedule banners with provider props", () => {
    expect(shellSource).toContain("TvScheduleStatusBanners");
    expect(shellSource).toContain("scheduleError={scheduleError}");
    expect(shellSource).toContain("retryScheduleLoad={retryScheduleLoad}");
  });
});
