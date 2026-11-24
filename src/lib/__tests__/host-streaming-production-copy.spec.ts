import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../..");

describe("host streaming production copy", () => {
  it("dashboard does not advertise Stripe test, staging API, or test pricing", () => {
    const src = readFileSync(
      join(root, "components/host/host-streaming-dashboard-client.tsx"),
      "utf8"
    );
    expect(src).not.toMatch(/Stripe test/i);
    expect(src).not.toMatch(/staging API/i);
    expect(src).not.toMatch(/£10 test/i);
    expect(src).toContain("Buy 240-credit pack");
    expect(src).toContain("HostStreamingWalletPanel");
  });

  it("host profile subscriptions surface exposes streaming wallet panel", () => {
    const src = readFileSync(
      join(root, "components/dashboard/host-profile-client.tsx"),
      "utf8"
    );
    expect(src).toContain("HostStreamingWalletPanel");
    expect(src).toContain("/streaming");
  });
});
