import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Trusted-LAN Finish B: Caddy must forward Host:port so Next.js Server Actions
 * accept Origin `192.168.1.202:3443` (digest 2657211132 regression), and must
 * rewrite /@handle → /creator/handle so middleware does not target
 * https://localhost:3014/creator/... (EPROTO/500).
 */
describe("Finish B Caddy X-Forwarded-Host", () => {
  it("uses hostport (not bare host) when Caddyfile is present", () => {
    const caddyfile = path.join(homedir(), "finish-b-lan-tools", "Caddyfile");
    if (!existsSync(caddyfile)) {
      // Optional local tool config — skip when not on LAN acceptance machine
      expect(true).toBe(true);
      return;
    }
    const text = readFileSync(caddyfile, "utf8");
    expect(text).toMatch(/X-Forwarded-Host\s+\{http\.request\.hostport\}/);
    expect(text).not.toMatch(/X-Forwarded-Host\s+\{host\}/);
    expect(text).toMatch(/header_up\s+Host\s+\{http\.request\.hostport\}/);
    expect(text).toMatch(/rewrite\s+@creator_at\s+\/creator\/\{re\.creator_at\.1\}/);
    expect(text).toMatch(/\^\/@\(\[\^\/\]\+\)\/\?\$/);
  });
});
