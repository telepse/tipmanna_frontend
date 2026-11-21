import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LEGAL_ROUTES } from "@/lib/legal-routes";

const srcRoot = join(__dirname, "../..");
const read = (relativePath: string) =>
  readFileSync(join(srcRoot, relativePath), "utf8");

describe("legal routes", () => {
  it("serves the main and Android TV service terms pages", () => {
    expect(LEGAL_ROUTES.androidTvServiceTerms).toBe("/terms/android-tv");
    expect(existsSync(join(srcRoot, "app/terms/page.tsx"))).toBe(true);
    expect(existsSync(join(srcRoot, "app/terms/android-tv/page.tsx"))).toBe(
      true
    );
  });

  it("features the Android TV terms on the main service terms page", () => {
    expect(read("app/terms/page.tsx")).toContain(
      "href={LEGAL_ROUTES.androidTvServiceTerms}"
    );
  });

  it("shows the service terms banner on the cookie policy page", () => {
    expect(read("app/cookie-policy/page.tsx")).toContain("<ServiceTermsBanner");
    expect(read("components/banners/service-terms-banner.tsx")).toContain(
      "href={LEGAL_ROUTES.serviceTerms}"
    );
  });

  it.each(["components/shared/footer.tsx", "app/(dashboard)/layout.tsx"])(
    "%s links Terms & Conditions to the service terms page",
    file => {
      const src = read(file);
      expect(src).toContain(
        '{ href: LEGAL_ROUTES.serviceTerms, label: "Terms & Conditions" }'
      );
      expect(src).not.toMatch(/href: "#"/);
    }
  );
});
