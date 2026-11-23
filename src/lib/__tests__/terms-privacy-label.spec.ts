import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LEGAL_ROUTES } from "@/lib/legal-routes";

describe("TermsPrivacyLabel", () => {
  it("links terms to the service terms page and privacy to privacy policy", () => {
    const src = readFileSync(
      join(__dirname, "../../components/auth/terms-privacy-label.tsx"),
      "utf8"
    );
    expect(LEGAL_ROUTES.serviceTerms).toBe("/terms");
    expect(LEGAL_ROUTES.privacyPolicy).toBe("/privacy-policy");
    expect(src).toContain("href={LEGAL_ROUTES.serviceTerms}");
    expect(src).toContain("href={LEGAL_ROUTES.privacyPolicy}");
    expect(src).not.toContain("/cookie-policy");
    expect(src).toContain('target="_blank"');
    expect(src).toContain('rel="noopener noreferrer"');
  });
});
