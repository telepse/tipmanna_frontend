import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("useTipConfig Explore E2E gate", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../use-tip-config.ts"),
    "utf8"
  );

  it("skips fetch and Pusher under ActiveOnClient", () => {
    expect(src).toMatch(
      /import \{ isExploreE2eFixturesActiveOnClient \} from "@\/lib\/explore-e2e-fixtures-gate"/
    );
    expect(src).toMatch(/Dual-gate: skip tip-config fetch under Explore E2E/);
    expect(src).toMatch(/Dual-gate: skip tip-config Pusher under Explore E2E/);
    const fetchBlock = src.slice(
      src.indexOf("Dual-gate: skip tip-config fetch"),
      src.indexOf("hasInitialRef.current")
    );
    expect(fetchBlock).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(fetchBlock).toMatch(/mode: "legacy"/);

    const pusherBlock = src.slice(
      src.indexOf("Dual-gate: skip tip-config Pusher"),
      src.indexOf("tip-config-${eventId}")
    );
    expect(pusherBlock).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(pusherBlock).toMatch(/return;/);
  });

  it("non-E2E path still uses subscribeChannel for tip-config channel", () => {
    expect(src).toMatch(/subscribeChannel\(channelName\)/);
    expect(src).toMatch(/tip-config-\$\{eventId\}/);
    expect(src).toMatch(/fetch\(`\$\{apiBase\(\)\}\/tip-config/);
  });
});
