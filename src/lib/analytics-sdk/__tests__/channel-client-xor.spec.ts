import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("P1-4 channel-client XOR", () => {
  it("uses adapter and not direct playback trackTv* or analytics-sdk", () => {
    const src = read("components/events/channel-client.tsx");
    expect(src).toMatch(/channel-client-analytics/);
    expect(src).not.toMatch(/@\/lib\/analytics-sdk/);
    expect(src).not.toMatch(/trackTvVideoEncounter/);
    expect(src).not.toMatch(/trackTvVideoStart/);
    expect(src).not.toMatch(/trackTvWatchDuration/);
    expect(src).not.toMatch(/trackTvVideoComplete/);
    expect(src).not.toMatch(/initTvAnalyticsRuntime/);
    expect(src).not.toMatch(/setTvAnalyticsContext/);
  });
});
