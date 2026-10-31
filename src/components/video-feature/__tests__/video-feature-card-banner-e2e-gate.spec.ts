import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("VideoFeatureCardBanner Explore E2E gate", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../video-feature-card-banner.tsx"),
    "utf8"
  );

  it("skips active-card fetch and Pusher subscribe under ActiveOnClient", () => {
    expect(src).toMatch(
      /import \{ isExploreE2eFixturesActiveOnClient \} from "@\/lib\/explore-e2e-fixtures-gate"/
    );
    const targetIdx = src.indexOf(
      "const targetChannelName = `video-card-target-${surfaceChannelId}`"
    );
    const pusherEffect = src.slice(targetIdx - 200, targetIdx + 80);
    expect(pusherEffect).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(pusherEffect).toMatch(/return;/);

    const refetchMount = src.indexOf("}, [refetchActiveCards]);");
    const refetchEffect = src.slice(refetchMount - 180, refetchMount);
    expect(refetchEffect).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
  });

  it("non-E2E path still subscribes to target and global feature-card channels", () => {
    expect(src).toMatch(/video-card-target-\$\{surfaceChannelId\}/);
    expect(src).toMatch(/video-card-global/);
    expect(src).toMatch(/subscribeChannel\(targetChannelName\)/);
    expect(src).toMatch(/subscribeChannel\(globalChannelName\)/);
  });
});
