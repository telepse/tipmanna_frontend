import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("SideChickProvider Explore E2E gate", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../side-chick-provider.tsx"),
    "utf8"
  );

  it("gates tipper and community Pusher subscribe under ActiveOnClient", () => {
    expect(src).toMatch(
      /import \{ isExploreE2eFixturesActiveOnClient \} from "@\/lib\/explore-e2e-fixtures-gate"/
    );
    const tipperEffect = src.slice(
      src.indexOf("Dual-gate: skip SideChick Pusher"),
      src.indexOf("subscribeChannel(name)")
    );
    expect(tipperEffect).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(tipperEffect).toMatch(/return;/);
    expect(tipperEffect).toMatch(/user-tipper-/);

    const secondGate = src.indexOf(
      "isExploreE2eFixturesActiveOnClient()",
      src.indexOf("activation?.communityId")
    );
    expect(secondGate).toBeGreaterThan(-1);
    const communitySubscribe = src.indexOf(
      "subscribeChannel(name)",
      secondGate
    );
    expect(communitySubscribe).toBeGreaterThan(secondGate);
  });

  it("non-E2E path still calls subscribeChannel for tipper and community channels", () => {
    expect(src).toMatch(/subscribeChannel\(name\)/);
    expect(src).toMatch(/user-tipper-\$\{user\.id\}/);
    expect(src).toMatch(/community-\$\{id\}/);
  });
});
