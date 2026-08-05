import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetYoutubeIframeApiLoaderForTest,
  acquireYoutubeIframeApi,
  findExistingIframeApiScript,
  isYoutubeIframeApiReady,
  isYoutubeIframeApiScriptSrc,
  YOUTUBE_IFRAME_API_CANONICAL_URL,
  YOUTUBE_IFRAME_API_SCRIPT_ID,
} from "../youtube-iframe-api-loader";

type WindowWithYt = Window & {
  YT?: { Player?: new (...args: unknown[]) => unknown };
  onYouTubeIframeAPIReady?: () => void;
};

function setYtPlayerPresent(w: WindowWithYt): void {
  (w as { YT?: { Player?: unknown } }).YT = { Player: class {} };
}

const testGlobal = globalThis as unknown as { window?: WindowWithYt };

function installWindow() {
  const scripts: HTMLScriptElement[] = [];
  const createScript = (): HTMLScriptElement => {
    const listeners: Record<string, Array<() => void>> = {};
    const attrs: Record<string, string> = {};
    const el = {
      id: "",
      src: "",
      getAttribute: (name: string) =>
        attrs[name] ?? (name === "src" ? el.src || null : null),
      setAttribute: (name: string, value: string) => {
        attrs[name] = value;
        if (name === "src") el.src = value;
        if (name === "id") el.id = value;
      },
      addEventListener: (type: string, fn: () => void) => {
        (listeners[type] ??= []).push(fn);
      },
      remove: () => {
        const idx = scripts.indexOf(el as unknown as HTMLScriptElement);
        if (idx >= 0) scripts.splice(idx, 1);
      },
      _emit: (type: string) => {
        for (const fn of listeners[type] ?? []) fn();
      },
    } as unknown as HTMLScriptElement & { _emit: (type: string) => void };
    return el;
  };

  testGlobal.window = {
    YT: undefined,
    onYouTubeIframeAPIReady: undefined,
  } as WindowWithYt;

  (globalThis as { window: WindowWithYt }).window = testGlobal.window;

  vi.stubGlobal("document", {
    body: {
      appendChild: (el: HTMLScriptElement) => {
        scripts.push(el);
        return el;
      },
    },
    head: {
      appendChild: (el: HTMLScriptElement) => {
        scripts.push(el);
        return el;
      },
    },
    createElement: (tag: string) => {
      if (tag === "script") return createScript();
      return {} as HTMLElement;
    },
    getElementById: (id: string) => scripts.find(s => s.id === id) ?? null,
    querySelectorAll: (sel: string) => {
      if (sel === "script[src]") return scripts;
      return [];
    },
  });

  return scripts;
}

beforeEach(() => {
  __resetYoutubeIframeApiLoaderForTest();
  vi.useFakeTimers();
});

afterEach(() => {
  __resetYoutubeIframeApiLoaderForTest();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete testGlobal.window;
});

describe("isYoutubeIframeApiScriptSrc", () => {
  it("recognizes canonical iframe_api URL", () => {
    expect(isYoutubeIframeApiScriptSrc(YOUTUBE_IFRAME_API_CANONICAL_URL)).toBe(
      true
    );
    expect(
      isYoutubeIframeApiScriptSrc("https://www.youtube.com/iframe_api?foo=1")
    ).toBe(true);
  });

  it("rejects unrelated URLs", () => {
    expect(isYoutubeIframeApiScriptSrc("https://example.com/iframe_api")).toBe(
      false
    );
  });
});

describe("acquireYoutubeIframeApi", () => {
  it("resolves immediately when YT.Player exists", async () => {
    installWindow();
    setYtPlayerPresent(testGlobal.window!);

    const result = await acquireYoutubeIframeApi();
    expect(result.outcome).toBe("reused_existing_object");
    expect(isYoutubeIframeApiReady()).toBe(true);
  });

  it("inserts one canonical script when none exists", async () => {
    const scripts = installWindow();
    const deadline = performance.now() + 8000;

    const pending = acquireYoutubeIframeApi({ absoluteDeadlineMs: deadline });
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.id).toBe(YOUTUBE_IFRAME_API_SCRIPT_ID);
    expect(scripts[0]!.src).toBe(YOUTUBE_IFRAME_API_CANONICAL_URL);

    setYtPlayerPresent(testGlobal.window!);
    testGlobal.window!.onYouTubeIframeAPIReady?.();

    const result = await pending;
    expect(result.outcome).toBe("script_inserted");
  });

  it("reuses existing script by src without inserting duplicate", async () => {
    const scripts = installWindow();
    const existing = document.createElement("script");
    existing.src = "https://www.youtube.com/iframe_api";
    scripts.push(existing);

    const pending = acquireYoutubeIframeApi({
      absoluteDeadlineMs: performance.now() + 8000,
    });
    expect(scripts).toHaveLength(1);

    setYtPlayerPresent(testGlobal.window!);
    testGlobal.window!.onYouTubeIframeAPIReady?.();

    const result = await pending;
    expect(result.outcome).toBe("reused_existing_script");
  });

  it("chains prior onYouTubeIframeAPIReady and survives prior throw", async () => {
    installWindow();
    const prior = vi.fn(() => {
      throw new Error("prior failed");
    });
    testGlobal.window!.onYouTubeIframeAPIReady = prior;

    const pending = acquireYoutubeIframeApi({
      absoluteDeadlineMs: performance.now() + 8000,
    });

    setYtPlayerPresent(testGlobal.window!);
    testGlobal.window!.onYouTubeIframeAPIReady?.();

    await expect(pending).resolves.toMatchObject({ state: "ready" });
    expect(prior).toHaveBeenCalled();
  });

  it("shares one promise across concurrent callers", async () => {
    const scripts = installWindow();
    const p1 = acquireYoutubeIframeApi({
      absoluteDeadlineMs: performance.now() + 8000,
    });
    const p2 = acquireYoutubeIframeApi({
      absoluteDeadlineMs: performance.now() + 8000,
    });

    expect(scripts).toHaveLength(1);
    setYtPlayerPresent(testGlobal.window!);
    testGlobal.window!.onYouTubeIframeAPIReady?.();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
  });

  it("times out at absolute deadline without retry", async () => {
    const scripts = installWindow();
    const requestedAt = performance.now();
    const pending = acquireYoutubeIframeApi({
      absoluteDeadlineMs: requestedAt + 8000,
    });
    expect(scripts).toHaveLength(1);

    vi.advanceTimersByTime(8000);
    const result = await pending;
    expect(result.outcome).toBe("timed_out");
    expect(scripts).toHaveLength(0);
  });

  it("findExistingIframeApiScript detects head scripts without id", () => {
    const scripts = installWindow();
    const headScript = document.createElement("script");
    headScript.src = "https://www.youtube.com/iframe_api";
    scripts.push(headScript);
    expect(findExistingIframeApiScript()).toBe(headScript);
  });

  it("marks script failure and removes loader-owned script", async () => {
    const scripts = installWindow();
    const pending = acquireYoutubeIframeApi({
      absoluteDeadlineMs: performance.now() + 8000,
    });
    const tag = scripts[0] as HTMLScriptElement & {
      _emit?: (t: string) => void;
    };
    tag._emit?.("error");
    const result = await pending;
    expect(result.outcome).toBe("failed");
    expect(scripts).toHaveLength(0);
  });
});
