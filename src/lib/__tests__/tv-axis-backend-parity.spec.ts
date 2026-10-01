import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveBroadcastPosition,
  TV_HALF_DAY_SECONDS,
  type ScheduleItem,
} from "@/lib/tv/broadcastResolver";

const backendRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../backend"
);

const abFixture = (): ScheduleItem[] => [
  {
    id: "a",
    duration: 3600,
    axisStartSec: 0,
    axisEndSec: 3600,
    seekBaseSeconds: 0,
    channel: { url: "https://youtube.com/watch?v=a" },
  },
  {
    id: "b",
    duration: 3200,
    axisStartSec: 4000,
    axisEndSec: 7200,
    seekBaseSeconds: 0,
    channel: { url: "https://youtube.com/watch?v=b" },
  },
];

/** Canonical §8c expectations — mirrored in backend/src/lib/__tests__/tv-broadcast-position.spec.ts */
const PARITY_CASES: Array<{
  loopPosition: number;
  scheduleIndex: number;
  offsetSeconds: number;
}> = [
  { loopPosition: 1800, scheduleIndex: 0, offsetSeconds: 1800 },
  { loopPosition: 3800, scheduleIndex: 1, offsetSeconds: 0 },
  { loopPosition: 7300, scheduleIndex: 1, offsetSeconds: 3199 },
];

function fe(items: ScheduleItem[], loopPosition: number) {
  const pos = resolveBroadcastPosition(
    items,
    0,
    TV_HALF_DAY_SECONDS,
    loopPosition * 1000
  );
  return { scheduleIndex: pos.scheduleIndex, offsetSeconds: pos.offsetSeconds };
}

describe("G8-E — frontend/backend §8c parity", () => {
  it("frontend resolver matches canonical parity table", () => {
    const items = abFixture();
    for (const c of PARITY_CASES) {
      expect(fe(items, c.loopPosition)).toEqual({
        scheduleIndex: c.scheduleIndex,
        offsetSeconds: c.offsetSeconds,
      });
    }
  });

  it("backend source mirrors frontend axis helper structure", () => {
    const backendSrc = readFileSync(
      join(backendRoot, "src/lib/tv-broadcast-position.ts"),
      "utf8"
    );
    const frontendSrc = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../tv/broadcastResolver.ts"
      ),
      "utf8"
    );
    expect(backendSrc).toContain("resolveAxisBroadcastPosition");
    expect(frontendSrc).toContain("resolveAxisBroadcastPosition");
    expect(backendSrc).toContain("loopPosition < start");
    expect(frontendSrc).toContain("loopPosition < start");
  });
});
