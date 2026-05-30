/** How the YouTube iframe should fill its stage (layout mode, not device rotation). */
export type YoutubeIframeObjectFitMode = "cover" | "contain";

/** Intrinsic video size from oEmbed (or equivalent); used for aspect-correct contain. */
export type YoutubePresentationVideoSize = {
  width: number;
  height: number;
};

/**
 * Sizes the iframe like a replaced element so `object-fit` applies (Chrome / Safari).
 * Call after player ready and whenever `mode` changes.
 */
export function styleYoutubeIframePresentation(
  iframe: HTMLIFrameElement | null | undefined,
  mode: YoutubeIframeObjectFitMode
) {
  if (!iframe) return;
  iframe.style.position = "absolute";
  iframe.style.inset = "0";
  iframe.style.left = "";
  iframe.style.top = "";
  iframe.style.right = "";
  iframe.style.bottom = "";
  iframe.style.transform = "";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.objectFit = mode;
  iframe.style.objectPosition = "center";
  iframe.style.border = "0";
}

/**
 * `object-fit: contain` math using known video dimensions: scale = min(cw/vw, ch/vh).
 * Portrait sources in a wide stage hit the height limit (fit height); landscape in a tall
 * stage hit the width limit (fit width). Centered, uniform scale, no distortion.
 */
export function styleYoutubeIframeAspectContain(
  iframe: HTMLIFrameElement | null | undefined,
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number
) {
  if (!iframe || containerWidth <= 0 || containerHeight <= 0) return;
  const vw = videoWidth > 0 ? videoWidth : 16;
  const vh = videoHeight > 0 ? videoHeight : 9;
  const scale = Math.min(containerWidth / vw, containerHeight / vh);
  const dispW = vw * scale;
  const dispH = vh * scale;
  const left = (containerWidth - dispW) / 2;
  const top = (containerHeight - dispH) / 2;

  iframe.style.position = "absolute";
  iframe.style.inset = "auto";
  iframe.style.left = `${left}px`;
  iframe.style.top = `${top}px`;
  iframe.style.right = "";
  iframe.style.bottom = "";
  iframe.style.transform = "";
  iframe.style.width = `${dispW}px`;
  iframe.style.height = `${dispH}px`;
  iframe.style.objectFit = "contain";
  iframe.style.objectPosition = "center";
  iframe.style.border = "0";
}

/**
 * `object-fit: cover` math: scale = max(cw/vw, ch/vh), centered; parent should use
 * overflow:hidden. Portrait clips in a wide stage fill vertical height (and crop sides);
 * avoids a narrow centered “pillar” from contain.
 */
export function styleYoutubeIframeAspectCover(
  iframe: HTMLIFrameElement | null | undefined,
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number
) {
  if (!iframe || containerWidth <= 0 || containerHeight <= 0) return;
  const vw = videoWidth > 0 ? videoWidth : 16;
  const vh = videoHeight > 0 ? videoHeight : 9;
  const scale = Math.max(containerWidth / vw, containerHeight / vh);
  const dispW = vw * scale;
  const dispH = vh * scale;
  const left = (containerWidth - dispW) / 2;
  const top = (containerHeight - dispH) / 2;

  iframe.style.position = "absolute";
  iframe.style.inset = "auto";
  iframe.style.left = `${left}px`;
  iframe.style.top = `${top}px`;
  iframe.style.right = "";
  iframe.style.bottom = "";
  iframe.style.transform = "";
  iframe.style.width = `${dispW}px`;
  iframe.style.height = `${dispH}px`;
  iframe.style.objectFit = "contain";
  iframe.style.objectPosition = "center";
  iframe.style.border = "0";
}

/** Restore default iframe layout when leaving full-view presentation. */
export function clearYoutubeIframePresentation(
  iframe: HTMLIFrameElement | null | undefined
) {
  if (!iframe) return;
  iframe.style.position = "";
  iframe.style.inset = "";
  iframe.style.left = "";
  iframe.style.top = "";
  iframe.style.right = "";
  iframe.style.bottom = "";
  iframe.style.transform = "";
  iframe.style.width = "";
  iframe.style.height = "";
  iframe.style.objectFit = "";
  iframe.style.objectPosition = "";
  iframe.style.border = "";
}
