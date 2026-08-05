import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetTvYoutubePreconnectForTest,
  TvYoutubePreconnect,
} from "../../components/tv/tv-youtube-preconnect";

const preconnect = vi.fn();
const prefetchDNS = vi.fn();

vi.mock("react-dom", () => ({
  preconnect: (...args: unknown[]) => preconnect(...args),
  prefetchDNS: (...args: unknown[]) => prefetchDNS(...args),
}));

const ORIGINAL = process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT;

beforeEach(() => {
  __resetTvYoutubePreconnectForTest();
  preconnect.mockClear();
  prefetchDNS.mockClear();
  delete process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT;
  (globalThis as { window?: object }).window = {};
});

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT;
  } else {
    process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT = ORIGINAL;
  }
  delete (globalThis as { window?: object }).window;
});

describe("TvYoutubePreconnect client deduplication", () => {
  it("emits legacy client hints when SSR flag is off", () => {
    TvYoutubePreconnect();
    expect(preconnect).toHaveBeenCalledWith(
      "https://www.youtube-nocookie.com",
      {
        crossOrigin: "anonymous",
      }
    );
    expect(preconnect).toHaveBeenCalledWith("https://www.youtube.com");
    expect(preconnect).toHaveBeenCalledWith("https://i.ytimg.com");
    expect(prefetchDNS).toHaveBeenCalledWith(
      "https://www.youtube-nocookie.com"
    );
    expect(prefetchDNS).toHaveBeenCalledWith("https://i.ytimg.com");
    expect(
      preconnect.mock.calls.filter(c => c[0] === "https://www.youtube.com")
    ).toHaveLength(1);
    expect(
      preconnect.mock.calls.filter(
        c => c[0] === "https://www.youtube-nocookie.com"
      )
    ).toHaveLength(1);
  });

  it("skips duplicate youtube.com and nocookie hints when SSR flag is on", () => {
    process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT = "1";
    TvYoutubePreconnect();

    expect(
      preconnect.mock.calls.filter(c => c[0] === "https://www.youtube.com")
    ).toHaveLength(0);
    expect(
      preconnect.mock.calls.filter(
        c => c[0] === "https://www.youtube-nocookie.com"
      )
    ).toHaveLength(0);
    expect(prefetchDNS).not.toHaveBeenCalledWith(
      "https://www.youtube-nocookie.com"
    );
    expect(preconnect).toHaveBeenCalledWith("https://i.ytimg.com");
  });
});
