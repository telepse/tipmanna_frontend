import { extractYoutubeID } from "@/lib/extractYoutubeID";

export type ImmersiveLayoutMode = "landscape_video" | "portrait_video";

/** Canonical shape for layout and analytics (not tied to ImmersiveLayoutMode naming). */
export type YoutubeVideoClassification = "portrait" | "landscape" | "square";

export type YoutubeAspectInfo = {
  videoId: string;
  width: number;
  height: number;
  /** width / height (e.g. 16/9 ≈ 1.78 landscape, 9/16 ≈ 0.56 portrait). */
  aspectRatio: number;
  classification: YoutubeVideoClassification;
};

const aspectInfoCache = new Map<string, YoutubeAspectInfo>();
/** Failed oEmbed lookups — short TTL so 16:9 fallback is not treated as permanent truth. */
const aspectInfoFailureUntil = new Map<string, number>();

const DEFAULT_W = 16;
const DEFAULT_H = 9;
const OEMBED_FAILURE_TTL_MS = 60_000;

/** YouTube Shorts URLs are vertical even when oEmbed reports 16:9. */
export function isYoutubeShortsUrl(
  videoUrl: string | null | undefined
): boolean {
  if (!videoUrl || typeof videoUrl !== "string") return false;
  const lower = videoUrl.toLowerCase();
  return (
    /youtube\.com\/shorts\//i.test(lower) ||
    /youtu\.be\/shorts\//i.test(lower) ||
    lower.includes("#shorts")
  );
}

function buildAspectInfo(
  videoId: string,
  width: number,
  height: number,
  forcePortrait = false
): YoutubeAspectInfo {
  const w = width > 0 ? width : DEFAULT_W;
  const h = height > 0 ? height : DEFAULT_H;
  const classification = forcePortrait
    ? "portrait"
    : classifyYoutubeVideoShape(w, h);
  return {
    videoId,
    width: forcePortrait ? DEFAULT_H : w,
    height: forcePortrait ? DEFAULT_W : h,
    aspectRatio: forcePortrait ? DEFAULT_H / DEFAULT_W : w / h,
    classification,
  };
}

/** oEmbed / intrinsic-style dimensions; Shorts often report height > width. */
export function classifyYoutubeVideoShape(
  width: number,
  height: number
): YoutubeVideoClassification {
  if (width <= 0 || height <= 0) return "landscape";
  const hwRatio = height / width;
  if (hwRatio >= 0.95 && hwRatio <= 1.05) return "square";
  return hwRatio > 1.05 ? "portrait" : "landscape";
}

export function classificationToImmersiveLayoutMode(
  c: YoutubeVideoClassification
): ImmersiveLayoutMode {
  return c === "portrait" ? "portrait_video" : "landscape_video";
}

/** @deprecated Prefer classifyYoutubeVideoShape */
export function classifyImmersiveLayout(
  width: number,
  height: number
): ImmersiveLayoutMode {
  return classificationToImmersiveLayoutMode(
    classifyYoutubeVideoShape(width, height)
  );
}

/**
 * Resolve YouTube video width/height via oEmbed (same-origin friendly).
 * Caches by video id. Does not use the iframe Player API for dimensions (not exposed cross-origin).
 */
export async function fetchYoutubeAspectInfo(
  videoUrl: string | null | undefined
): Promise<YoutubeAspectInfo | null> {
  if (!videoUrl) return null;
  const id = extractYoutubeID(videoUrl);
  if (!id) return null;

  const shorts = isYoutubeShortsUrl(videoUrl);

  const cached = aspectInfoCache.get(id);
  if (cached) {
    if (shorts && cached.classification !== "portrait") {
      const forced = buildAspectInfo(id, cached.width, cached.height, true);
      aspectInfoCache.set(id, forced);
      return forced;
    }
    return cached;
  }

  const failUntil = aspectInfoFailureUntil.get(id);
  if (failUntil != null) {
    if (Date.now() < failUntil) {
      return buildAspectInfo(id, DEFAULT_W, DEFAULT_H, shorts);
    }
    aspectInfoFailureUntil.delete(id);
  }

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${id}`;
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
    );
    if (!res.ok) {
      aspectInfoFailureUntil.set(id, Date.now() + OEMBED_FAILURE_TTL_MS);
      return buildAspectInfo(id, DEFAULT_W, DEFAULT_H, shorts);
    }
    const data = (await res.json()) as { width?: number; height?: number };
    const w = typeof data.width === "number" ? data.width : DEFAULT_W;
    const h = typeof data.height === "number" ? data.height : DEFAULT_H;
    const info = buildAspectInfo(id, w, h, shorts);
    aspectInfoCache.set(id, info);
    aspectInfoFailureUntil.delete(id);
    return info;
  } catch {
    aspectInfoFailureUntil.set(id, Date.now() + OEMBED_FAILURE_TTL_MS);
    return buildAspectInfo(id, DEFAULT_W, DEFAULT_H, shorts);
  }
}

export async function fetchYoutubeImmersiveLayout(
  videoUrl: string | null | undefined
): Promise<ImmersiveLayoutMode> {
  const info = await fetchYoutubeAspectInfo(videoUrl);
  if (!info) return "landscape_video";
  return classificationToImmersiveLayoutMode(info.classification);
}

/** For tests or forcing refresh after external metadata change. */
export function clearYoutubeAspectInfoCache(videoId?: string): void {
  if (videoId) {
    aspectInfoCache.delete(videoId);
    aspectInfoFailureUntil.delete(videoId);
  } else {
    aspectInfoCache.clear();
    aspectInfoFailureUntil.clear();
  }
}
