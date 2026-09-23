import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("event-tiplink-tab prefill contract", () => {
  it("seeds title and description from selected channel after draft create", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/tiplink/event-tiplink-tab.tsx"),
      "utf8"
    );
    expect(source).toContain("title: channel?.title");
    expect(source).toContain("channel?.description");
    expect(source).not.toMatch(
      /setForm\(f => \(\{ \.\.\.f, slug: res\.data!\.tipLink\.slug, pitch: "" \}\)\)/
    );
  });
});
