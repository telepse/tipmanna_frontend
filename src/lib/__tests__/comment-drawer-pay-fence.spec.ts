import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("comment drawer pay fence", () => {
  it("routes handlePay only through onContinueToTip without pin selection", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/events/comment-drawer.tsx"),
      "utf8"
    );

    expect(source).toContain("const handlePay = () => {");
    expect(source).toContain("onContinueToTip?.();");
    expect(source).not.toMatch(
      /pin.*modal|PinSelection|paymentSurface.*event_room/i
    );
  });
});
