import { describe, expect, it } from "vitest";

import { selectEventActorBearer } from "@/lib/event-actor-auth";

const cohostEventA = {
  token: "cohost-jwt-a",
  eventId: "event-a",
  active: true,
};

const cohostEventB = {
  token: "cohost-jwt-b",
  eventId: "event-b",
  active: true,
};

describe("selectEventActorBearer", () => {
  it("prefers scoped cohost on event-room surface when event matches", () => {
    expect(
      selectEventActorBearer({
        eventId: "event-a",
        preferHostSession: false,
        cohost: cohostEventA,
        hostToken: "host-jwt",
        primaryToken: "tipper-jwt",
      })
    ).toBe("cohost-jwt-a");
  });

  it("prefers hostToken on host dashboard when both host and scoped cohost exist", () => {
    expect(
      selectEventActorBearer({
        eventId: "event-a",
        preferHostSession: true,
        cohost: cohostEventA,
        hostToken: "host-jwt",
        primaryToken: "tipper-jwt",
      })
    ).toBe("host-jwt");
  });

  it("does not use cohost token scoped to a different event", () => {
    expect(
      selectEventActorBearer({
        eventId: "event-a",
        preferHostSession: false,
        cohost: cohostEventB,
        hostToken: "host-jwt",
        primaryToken: null,
      })
    ).toBe("host-jwt");
  });

  it("falls back to primary token when no host or matching cohost", () => {
    expect(
      selectEventActorBearer({
        eventId: "event-a",
        cohost: null,
        hostToken: null,
        primaryToken: "tipper-jwt",
      })
    ).toBe("tipper-jwt");
  });

  it("returns null when no actor tokens are present", () => {
    expect(
      selectEventActorBearer({
        eventId: "event-a",
        cohost: null,
        hostToken: null,
        primaryToken: null,
      })
    ).toBeNull();
  });
});
