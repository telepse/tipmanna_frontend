import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("tv-live-preview-player ref contract", () => {
  it("declares embed and pending load refs", () => {
    const source = readFileSync(
      join(frontendRoot, "src/components/home/tv-live-preview-player.tsx"),
      "utf8"
    );
    for (const name of [
      "embedVideoUrlRef",
      "embedStartSecondsRef",
      "embedEnableLiveOffsetRef",
      "loadedScheduleIndexRef",
      "loadedVideoIdRef",
      "pendingLoadRef",
      "modeRef",
    ]) {
      expect(source).toMatch(new RegExp(`const ${name} = useRef`));
    }
  });
});
