import { describe, expect, it } from "vitest";

import {
  composeTipperDisplayHandle,
  formatTipperDisplayLabel,
  splitTipperDisplayHandle,
} from "@/lib/tipper-display-handle";

describe("tipper display handle (frontend)", () => {
  const slug = "tipperjane42";

  it("formats complete handle without duplication", () => {
    expect(formatTipperDisplayLabel("tipperjane42", slug)).toBe("tipperjane42");
  });

  it("does not concatenate prefix when display is already complete", () => {
    const label = formatTipperDisplayLabel("tipperjane42", slug);
    expect(label).not.toContain("tippertipper");
  });

  it("composes edited middle with slug digits", () => {
    expect(composeTipperDisplayHandle("janet", slug)).toBe("tipperjanet42");
  });

  it("splits duplicated storage using slug", () => {
    expect(splitTipperDisplayHandle("tippertipperjane4242", slug).middle).toBe(
      "jane"
    );
  });
});
