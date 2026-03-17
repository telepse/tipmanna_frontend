let bootstrapped = false;

export function bootstrapAnimations() {
  if (bootstrapped) return;
  if (typeof window === "undefined") return;

  bootstrapped = true;

  console.log("[ANIM BOOTSTRAP] initializing", {
    visibility: document.visibilityState,
    raf: typeof requestAnimationFrame === "function",
    now: performance.now(),
  }); // Visibility recovery (critical for prod)

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("[ANIM BOOTSTRAP] tab resumed");
      window.dispatchEvent(new Event("animation-resume"));
    }
  }); // Safety net: force repaint

  requestAnimationFrame(() => {});
}
