import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Pusher client Explore E2E gate", () => {
  const pusher = fs.readFileSync(
    path.join(__dirname, "../pusher.ts"),
    "utf8"
  );
  const presence = fs.readFileSync(
    path.join(__dirname, "../global-tv-presence-hub.ts"),
    "utf8"
  );

  it("getPusherClient returns early under ActiveOnClient", () => {
    const block = pusher.slice(
      pusher.indexOf("export function getPusherClient"),
      pusher.indexOf("const key = process.env.NEXT_PUBLIC_PUSHER_KEY")
    );
    expect(block).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(block).toMatch(/return null/);
  });

  it("global TV presence hub skips subscribe and wire under ActiveOnClient", () => {
    expect(presence).toMatch(
      /subscribeGlobalTvPresence[\s\S]*isExploreE2eFixturesActiveOnClient\(\)/
    );
    const wire = presence.slice(
      presence.indexOf("function wirePusher"),
      presence.indexOf("export function subscribeGlobalTvPresence")
    );
    expect(wire).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
  });
});
