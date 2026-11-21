import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("P1-3 stop gate", () => {
  it("channel-client does not import analytics-sdk directly", () => {
    const src = read("components/events/channel-client.tsx");
    expect(src).not.toMatch(/@\/lib\/analytics-sdk/);
  });
});
