import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Wave 1B host session renewal invariants (source)", () => {
  it("HostDashboardSessionTouch still posts /api/auth/host-session/touch on 5 min interval", () => {
    const src = readSrc("components/auth/host-dashboard-session-touch.tsx");
    expect(src).toContain('fetch("/api/auth/host-session/touch"');
    expect(src).toContain("TOUCH_INTERVAL_MS = 5 * 60 * 1000");
    expect(src).toContain("setInterval");
  });

  it("SessionActivityPinger still refreshes host cookies off /host via touch API", () => {
    const src = readSrc("components/auth/session-activity-pinger.tsx");
    expect(src).toContain('fetch("/api/auth/host-session/touch"');
    expect(src).toContain("TOUCH_INTERVAL_MS = 5 * 60 * 1000");
    expect(src).toContain("onHostDashboard");
    expect(src).toContain("pathname.startsWith(\"/host\")");
  });

  it("verifyHostSessionWithBackend still rewrites hostToken cookies", () => {
    const src = readSrc("app/api/auth/host-session/verify-host-session.ts");
    expect(src).toContain("/auth/session/touch");
    expect(src).toContain('res.cookies.set("hostToken"');
    expect(src).toContain("MAX_AGE_DAYS = 7");
  });

  it("presence-ping no longer calls /auth/session/touch", () => {
    const src = readSrc("app/api/notifications/presence-ping/route.ts");
    expect(src).not.toContain("/auth/session/touch");
    expect(src).toContain("/notifications/presence");
    expect(src).toContain("hostToken");
    expect(src).toContain("Bearer ${hostToken}");
  });

  it("presence pinger interval remains 45s and skips hidden tabs", () => {
    const src = readSrc(
      "components/notifications/notification-presence-pinger.tsx"
    );
    expect(src).toContain("PRESENCE_INTERVAL_MS = 45_000");
    expect(src).toContain('document.visibilityState !== "visible"');
    expect(src).toContain('"/api/notifications/presence-ping"');
  });

  it("hostToken cookie remains HttpOnly on session routes", () => {
    const verify = readSrc("app/api/auth/host-session/verify-host-session.ts");
    const route = readSrc("app/api/auth/host-session/route.ts");
    expect(verify).toMatch(/hostToken[\s\S]*httpOnly:\s*true/);
    expect(route).toMatch(/hostToken[\s\S]*httpOnly:\s*true/);
  });
});
