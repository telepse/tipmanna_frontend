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
  /** Where classification came from — useful for debugging layout. */
  source?: "oembed" | "thumbnail" | "fallback";
};

const aspectInfoCache = new Map<string, YoutubeAspectInfo>();
/** Failed oEmbed lookups — short TTL so 16:9 fallback is not treated as permanent truth. */
const aspectInfoFailureUntil = new Map<string, number>();

const DEFAULT_W = 16;
const DEFAULT_H = 9;
const OEMBED_FAILURE_TTL_MS = 60_000;

/** Canonical 9:16 when oEmbed/thumbnail are inconclusive for vertical Shorts. */
const SHORTS_PORTRAIT_W = 9;
const SHORTS_PORTRAIT_H = 16;

/** YouTube Shorts max duration — used when URL is watch?v= without /shorts/ path. */
const YOUTUBE_SHORTS_MAX_DURATION_SEC = 60;

export type YoutubeAspectFetchHints = {
  durationSeconds?: number | null;
};

/** YouTube Shorts URLs — portrait hint while metadata is still loading only. */
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

export function buildAspectInfo(
  videoId: string,
  width: number,
  height: number,
  source: YoutubeAspectInfo["source"] = "oembed"
): YoutubeAspectInfo {
  const w = width > 0 ? width : DEFAULT_W;
  const h = height > 0 ? height : DEFAULT_H;
  const classification = classifyYoutubeVideoShape(w, h);
  return {
    videoId,
    width: w,
    height: h,
    aspectRatio: w / h,
    classification,
    source,
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

/** YouTube oEmbed often returns the embed player box (480×360), not true video shape. */
export function isOembedEmbedPlayerDimensions(
  width: number,
  height: number
): boolean {
  if (width <= 0 || height <= 0) return true;
  if (width <= 640 && height <= 480 && width >= height) return true;
  const ratio = width / height;
  return (
    width <= 640 &&
    (Math.abs(ratio - 16 / 9) < 0.08 || Math.abs(ratio - 4 / 3) < 0.08)
  );
}

/** ytimg hqdefault/sddefault sizes — often letterboxed for vertical Shorts. */
export function isGenericYoutubeLandscapeThumbnail(
  width: number,
  height: number
): boolean {
  if (width <= 0 || height <= 0) return false;
  if (width === 480 && height === 360) return true;
  if (width === 640 && height === 480) return true;
  if (width === 1280 && height === 720) return true;
  return (
    width <= 1280 &&
    height <= 720 &&
    width >= height &&
    isOembedEmbedPlayerDimensions(width, height)
  );
}

/** True when metadata still looks like generic player/thumbnail chrome, not true video shape. */
export function isInconclusiveYoutubeAspect(info: YoutubeAspectInfo): boolean {
  if (info.classification === "portrait" || info.classification === "square") {
    return false;
  }
  if (isOembedEmbedPlayerDimensions(info.width, info.height)) return true;
  if (
    info.source === "thumbnail" &&
    isGenericYoutubeLandscapeThumbnail(info.width, info.height)
  ) {
    return true;
  }
  return false;
}

export function mergeAspectWithThumbnailProbe(
  oembed: YoutubeAspectInfo,
  thumb: { width: number; height: number } | null
): YoutubeAspectInfo {
  if (!thumb || thumb.width <= 0 || thumb.height <= 0) return oembed;
  if (thumb.width <= 120 && thumb.height <= 90) return oembed;

  const thumbClass = classifyYoutubeVideoShape(thumb.width, thumb.height);
  const oembedLooksLikePlayerChrome = isOembedEmbedPlayerDimensions(
    oembed.width,
    oembed.height
  );

  if (
    oembedLooksLikePlayerChrome &&
    (thumbClass === "portrait" || thumbClass === "square")
  ) {
    return buildAspectInfo(oembed.videoId, thumb.width, thumb.height, "thumbnail");
  }

  if (oembed.classification === "landscape" && thumbClass === "portrait") {
    return buildAspectInfo(oembed.videoId, thumb.width, thumb.height, "thumbnail");
  }

  return oembed;
}

export function classificationToImmersiveLayoutMode(
  c: YoutubeVideoClassification
): ImmersiveLayoutMode {
  return c === "portrait" || c === "square"
    ? "portrait_video"
    : "landscape_video";
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

/** ytimg OAR filenames preserve true 9:16 for Shorts / vertical uploads (not letterboxed). */
export function youtubeThumbnailUrls(videoId: string): string[] {
  return [
    `https://i.ytimg.com/vi/${videoId}/oardefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/oar2.jpg`,
    `https://i.ytimg.com/vi/${videoId}/oar1.jpg`,
    `https://i.ytimg.com/vi/${videoId}/oar3.jpg`,
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ];
}

export function loadImageDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  if (typeof Image === "undefined") return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Probe ytimg poster dimensions when oEmbed reports generic 16:9 player chrome. */
export async function probeYoutubeThumbnailDimensions(
  videoId: string
): Promise<{ width: number; height: number } | null> {
  const probes: { width: number; height: number }[] = [];
  for (const url of youtubeThumbnailUrls(videoId)) {
    const dims = await loadImageDimensions(url);
    if (!dims || dims.width <= 0 || dims.height <= 0) continue;
    if (dims.width <= 120 && dims.height <= 90) continue;
    probes.push(dims);
  }
  if (probes.length === 0) return null;

  const portraitLike = probes.filter(d => {
    const c = classifyYoutubeVideoShape(d.width, d.height);
    return c === "portrait" || c === "square";
  });
  if (portraitLike.length > 0) {
    return portraitLike.reduce((best, d) =>
      d.height / d.width > best.height / best.width ? d : best
    );
  }
  return probes[0];
}

export function mergeYoutubeAspectSources(
  primary: YoutubeAspectInfo | null,
  supplemental: YoutubeAspectInfo | null
): YoutubeAspectInfo | null {
  if (!primary) return supplemental;
  if (!supplemental) return primary;
  return mergeAspectWithThumbnailProbe(primary, {
    width: supplemental.width,
    height: supplemental.height,
  });
}

/** Shorts URL or typical Shorts duration when oEmbed reports generic player chrome. */
export function isLikelyYoutubeShort(params: {
  videoUrl: string | null | undefined;
  durationSeconds?: number | null;
}): boolean {
  if (isYoutubeShortsUrl(params.videoUrl)) return true;
  const d = params.durationSeconds;
  return typeof d === "number" && d > 0 && d <= YOUTUBE_SHORTS_MAX_DURATION_SEC;
}

/**
 * When oEmbed/thumbnail leave generic landscape chrome but the clip is likely a
 * vertical Short, apply a portrait 9:16 prior so layout and iframe agree.
 */
export function applyPortraitPriorForVerticalShort(
  info: YoutubeAspectInfo,
  videoUrl: string | null | undefined,
  hints?: YoutubeAspectFetchHints
): YoutubeAspectInfo {
  if (info.classification === "portrait" || info.classification === "square") {
    return info;
  }
  if (!isLikelyYoutubeShort({ videoUrl, durationSeconds: hints?.durationSeconds })) {
    return info;
  }
  if (!isInconclusiveYoutubeAspect(info)) {
    return info;
  }
  return buildAspectInfo(info.videoId, SHORTS_PORTRAIT_W, SHORTS_PORTRAIT_H, "fallback");
}

function finalizeYoutubeAspectInfo(
  info: YoutubeAspectInfo,
  videoUrl: string | null | undefined,
  hints?: YoutubeAspectFetchHints
): YoutubeAspectInfo {
  return applyPortraitPriorForVerticalShort(info, videoUrl, hints);
}

function cacheAndFinalizeAspect(
  id: string,
  info: YoutubeAspectInfo,
  videoUrl: string | null | undefined,
  hints?: YoutubeAspectFetchHints
): YoutubeAspectInfo {
  const finalized = finalizeYoutubeAspectInfo(info, videoUrl, hints);
  aspectInfoCache.set(id, finalized);
  return finalized;
}

async function resolveAspectWithProbes(
  videoId: string,
  oembedWidth: number,
  oembedHeight: number
): Promise<YoutubeAspectInfo> {
  let info = buildAspectInfo(videoId, oembedWidth, oembedHeight, "oembed");
  const thumb = await probeYoutubeThumbnailDimensions(videoId);
  info = mergeAspectWithThumbnailProbe(info, thumb);
  return info;
}

/**
 * Resolve YouTube video width/height via oEmbed + thumbnail probe.
 * Caches by video id. Does not use the iframe Player API for dimensions (not exposed cross-origin).
 */
export async function fetchYoutubeAspectInfo(
  videoUrl: string | null | undefined,
  hints?: YoutubeAspectFetchHints
): Promise<YoutubeAspectInfo | null> {
  if (!videoUrl) return null;
  const id = extractYoutubeID(videoUrl);
  if (!id) return null;

  const cached = aspectInfoCache.get(id);
  if (cached) {
    const finalized = finalizeYoutubeAspectInfo(cached, videoUrl, hints);
    if (
      finalized.classification !== cached.classification ||
      finalized.width !== cached.width ||
      finalized.height !== cached.height
    ) {
      aspectInfoCache.set(id, finalized);
    }
    return finalized;
  }

  const failUntil = aspectInfoFailureUntil.get(id);
  if (failUntil != null) {
    if (Date.now() < failUntil) {
      const thumb = await probeYoutubeThumbnailDimensions(id);
      if (thumb) {
        const fromThumb = buildAspectInfo(id, thumb.width, thumb.height, "thumbnail");
        return cacheAndFinalizeAspect(id, fromThumb, videoUrl, hints);
      }
      const fallback = buildAspectInfo(id, DEFAULT_W, DEFAULT_H, "fallback");
      return cacheAndFinalizeAspect(id, fallback, videoUrl, hints);
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
      const thumb = await probeYoutubeThumbnailDimensions(id);
      if (thumb) {
        const fromThumb = buildAspectInfo(id, thumb.width, thumb.height, "thumbnail");
        return cacheAndFinalizeAspect(id, fromThumb, videoUrl, hints);
      }
      const fallback = buildAspectInfo(id, DEFAULT_W, DEFAULT_H, "fallback");
      return cacheAndFinalizeAspect(id, fallback, videoUrl, hints);
    }
    const data = (await res.json()) as { width?: number; height?: number };
    const w = typeof data.width === "number" ? data.width : DEFAULT_W;
    const h = typeof data.height === "number" ? data.height : DEFAULT_H;
    const info = await resolveAspectWithProbes(id, w, h);
    aspectInfoFailureUntil.delete(id);
    return cacheAndFinalizeAspect(id, info, videoUrl, hints);
  } catch {
    aspectInfoFailureUntil.set(id, Date.now() + OEMBED_FAILURE_TTL_MS);
    const thumb = await probeYoutubeThumbnailDimensions(id);
    if (thumb) {
      const fromThumb = buildAspectInfo(id, thumb.width, thumb.height, "thumbnail");
      return cacheAndFinalizeAspect(id, fromThumb, videoUrl, hints);
    }
    const fallback = buildAspectInfo(id, DEFAULT_W, DEFAULT_H, "fallback");
    return cacheAndFinalizeAspect(id, fallback, videoUrl, hints);
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
