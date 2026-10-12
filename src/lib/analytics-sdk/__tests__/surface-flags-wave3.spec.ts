import { afterEach, describe, expect, it } from "vitest";

import {
  isContentClientSdkCollectionActive,
  isEventRoomSdkCollectionActive,
  isTiplinkSdkCollectionActive,
} from "../surface-flags";

describe("Wave 3 surface flags default off", () => {
  const keys = [
    "NEXT_PUBLIC_ANALYTICS_SDK_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_EVENT_ROOM_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_TIPLINK_V2",
  ] as const;

  const prev: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  });

  it("requires master SDK and surface flag", () => {
    for (const k of keys) prev[k] = process.env[k];
    delete process.env.NEXT_PUBLIC_ANALYTICS_SDK_V2;
    delete process.env.NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2;
    expect(isContentClientSdkCollectionActive()).toBe(false);

    process.env.NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2 = "true";
    expect(isContentClientSdkCollectionActive()).toBe(false);

    process.env.NEXT_PUBLIC_ANALYTICS_SDK_V2 = "true";
    expect(isContentClientSdkCollectionActive()).toBe(true);
    expect(isEventRoomSdkCollectionActive()).toBe(false);
    expect(isTiplinkSdkCollectionActive()).toBe(false);
  });
});
