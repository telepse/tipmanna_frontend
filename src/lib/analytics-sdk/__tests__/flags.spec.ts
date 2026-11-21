import { afterEach, describe, expect, it } from "vitest";

import { isAnalyticsSdkEnabled } from "../flags";
import { isContentClientSdkCollectionActive } from "../surface-flags";

describe("isAnalyticsSdkEnabled", () => {
  const key = "NEXT_PUBLIC_ANALYTICS_SDK_V2";
  let prev: string | undefined;

  afterEach(() => {
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  });

  it("is disabled when unset or not the literal true", () => {
    prev = process.env[key];
    delete process.env[key];
    expect(isAnalyticsSdkEnabled()).toBe(false);

    process.env[key] = "false";
    expect(isAnalyticsSdkEnabled()).toBe(false);

    process.env[key] = "1";
    expect(isAnalyticsSdkEnabled()).toBe(false);
  });

  it("is enabled only for the literal string true", () => {
    prev = process.env[key];
    process.env[key] = "true";
    expect(isAnalyticsSdkEnabled()).toBe(true);
  });

  it("master false disables sdk collection even when surface flag is true", () => {
    prev = process.env[key];
    const surfaceKey = "NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2";
    const surfacePrev = process.env[surfaceKey];
    process.env[surfaceKey] = "true";
    process.env[key] = "false";
    expect(isContentClientSdkCollectionActive()).toBe(false);
    if (surfacePrev === undefined) delete process.env[surfaceKey];
    else process.env[surfaceKey] = surfacePrev;
  });
});
