import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("TV mode indicator source of truth", () => {
  it("TvModeSelector reads mode only from useTV context", () => {
    const src = readFileSync(
      join(repoRoot, "src/components/tv/tv-mode-selector.tsx"),
      "utf8"
    );
    expect(src).toMatch(
      /\bmode,\s*goLive,\s*switchToLocal\s*\}\s*=\s*useTV\(\)/
    );
    expect(src).not.toMatch(/useState.*GLOBAL|useState.*LOCAL/);
  });

  it("TvInteractiveShell uses TvModeSelector for Live TV / Your TV labels", () => {
    const shell = readFileSync(
      join(repoRoot, "src/components/tv/tv-interactive-shell.tsx"),
      "utf8"
    );
    expect(shell).toContain("TvModeSelector");
    expect(shell).not.toMatch(/Your TV[\s\S]{0,80}mode === "LOCAL"/);
  });

  it("TvPhoneLandscapeTopBar embeds TvModeSelector (no mode prop)", () => {
    const bar = readFileSync(
      join(repoRoot, "src/components/tv/tv-phone-landscape-top-bar.tsx"),
      "utf8"
    );
    expect(bar).toContain("TvModeSelector");
    expect(bar).not.toContain('mode: "GLOBAL"');
  });
});
