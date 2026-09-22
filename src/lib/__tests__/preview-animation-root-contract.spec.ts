/**
 * Luxurious preview animations mount under #preview-animation-root.
 * Explore must use page chrome (never the hidden feed subtree).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readComponent(relPath: string): string {
  return readFileSync(join(frontendRoot, relPath), "utf8");
}

function countPreviewRootMounts(source: string): number {
  return (source.match(/id="preview-animation-root"/g) ?? []).length;
}

describe("preview-animation-root contract", () => {
  it("content-client mounts preview-animation-root", () => {
    expect(readComponent("src/components/events/content-client.tsx")).toMatch(
      /id="preview-animation-root"/
    );
  });

  it("channel-client mounts preview-animation-root", () => {
    expect(readComponent("src/components/events/channel-client.tsx")).toMatch(
      /id="preview-animation-root"/
    );
  });

  it("explore-page-client mounts preview-animation-root on shell chrome", () => {
    const source = readComponent(
      "src/components/explore/explore-page-client.tsx"
    );
    expect(source).toMatch(/id="preview-animation-root"/);
  });

  it("explore-feed-client does not mount preview-animation-root", () => {
    const source = readComponent(
      "src/components/explore/explore-feed-client.tsx"
    );
    expect(source).not.toMatch(/id="preview-animation-root"/);
  });

  it("each surface has at most one preview-animation-root id", () => {
    for (const rel of [
      "src/components/events/content-client.tsx",
      "src/components/events/channel-client.tsx",
      "src/components/explore/explore-page-client.tsx",
    ]) {
      expect(countPreviewRootMounts(readComponent(rel))).toBe(1);
    }
  });
});
