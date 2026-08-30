/** Shared native video restrictions (also used by VideoNativeMobileGuard). */

export const VIDEO_RESTRICTION_MARK = "data-tipmanna-video-restrictions";

export function patchNativeVideoElement(el: HTMLVideoElement): void {
  if (el.getAttribute(VIDEO_RESTRICTION_MARK) === "1") return;
  el.setAttribute(VIDEO_RESTRICTION_MARK, "1");

  try {
    el.disablePictureInPicture = true;
  } catch {
    /* strict WebViews */
  }

  el.playsInline = true;
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");
  el.setAttribute("controlsList", "nofullscreen nodownload noplaybackrate");

  try {
    const cl = (el as HTMLVideoElement & { controlsList?: DOMTokenList })
      .controlsList;
    if (cl?.add) {
      cl.add("nofullscreen");
      cl.add("nodownload");
      cl.add("noplaybackrate");
    }
  } catch {
    /* older browsers */
  }
}
