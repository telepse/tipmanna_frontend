import { describe, expect, it } from "vitest";

import {
  eventRoomAccessCodeCookieName,
  eventRoomAccessEmailCookieName,
  isEventRoomCredentialEventId,
  resolveEventRoomAccessCredentialsForFetch,
  shouldPersistAccessCodeCookies,
} from "../event-room-access-code-cookie";

const EVENT_A = "fc9c0e75-37a9-4743-ba19-e2862402f710";
const EVENT_B = "78501ccc-2376-40a7-8ab9-b2c622e665ac";

describe("event-room access credential cookies", () => {
  it("scopes cookie names per event id", () => {
    expect(eventRoomAccessCodeCookieName(EVENT_A)).toBe(
      `event_room_access_code_${EVENT_A}`
    );
    expect(eventRoomAccessCodeCookieName(EVENT_B)).not.toBe(
      eventRoomAccessCodeCookieName(EVENT_A)
    );
    expect(eventRoomAccessEmailCookieName(EVENT_A)).toContain(EVENT_A);
  });

  it("rejects invalid event ids for cookie names", () => {
    expect(isEventRoomCredentialEventId("not-a-uuid")).toBe(false);
    expect(() => eventRoomAccessCodeCookieName("bad")).toThrow();
  });

  it("prefers explicit opts over cookie values for the same event", () => {
    const resolved = resolveEventRoomAccessCredentialsForFetch(
      { accessCode: "FROM-OPTS", email: "a@b.com" },
      { accessCode: "FROM-COOKIE", email: "c@d.com" }
    );
    expect(resolved.accessCode).toBe("FROM-OPTS");
    expect(resolved.email).toBe("a@b.com");
  });

  it("falls back to cookie credentials when opts omit them", () => {
    const resolved = resolveEventRoomAccessCredentialsForFetch(undefined, {
      accessCode: "SECRET12",
      email: "tipper@example.com",
    });
    expect(resolved).toEqual({
      accessCode: "SECRET12",
      email: "tipper@example.com",
    });
  });

  it("returns null credentials when both sources are empty", () => {
    expect(
      resolveEventRoomAccessCredentialsForFetch({}, { accessCode: null })
    ).toEqual({ accessCode: null, email: null });
  });

  it("does not treat mismatched-event cookies as interchangeable", () => {
    const forA = resolveEventRoomAccessCredentialsForFetch(undefined, {
      accessCode: "CODE-A",
    });
    const forB = resolveEventRoomAccessCredentialsForFetch(undefined, {
      accessCode: "CODE-B",
    });
    expect(forA.accessCode).not.toBe(forB.accessCode);
  });

  it("persists cookies only for allowed host_code/custom_code submit", () => {
    expect(
      shouldPersistAccessCodeCookies({
        accessCode: "123456",
        allowed: true,
        accessMode: "host_code",
      })
    ).toBe(true);
    expect(
      shouldPersistAccessCodeCookies({
        accessCode: "123456",
        allowed: true,
        accessMode: "custom_code",
      })
    ).toBe(true);
    expect(
      shouldPersistAccessCodeCookies({
        accessCode: "123456",
        allowed: false,
        accessMode: "host_code",
      })
    ).toBe(false);
    expect(
      shouldPersistAccessCodeCookies({
        accessCode: "123456",
        allowed: true,
        accessMode: "email_gate",
      })
    ).toBe(false);
    expect(
      shouldPersistAccessCodeCookies({
        allowed: true,
        accessMode: "host_code",
      })
    ).toBe(false);
  });
});
