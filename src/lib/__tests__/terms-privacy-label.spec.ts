import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("TermsPrivacyLabel", () => {
  it("links terms to cookie policy and privacy to privacy policy", () => {
    const src = readFileSync(
      join(__dirname, "../../components/auth/terms-privacy-label.tsx"),
      "utf8"
    );
    expect(src).toContain('href="/cookie-policy"');
    expect(src).toContain('href="/privacy-policy"');
    expect(src).toContain('target="_blank"');
    expect(src).toContain('rel="noopener noreferrer"');
  });
});
