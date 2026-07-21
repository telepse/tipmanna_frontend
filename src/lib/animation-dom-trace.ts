import {
  isPaymentAnimationTraceEnabled,
  traceDomVisibilitySnapshot,
  tracePaymentAnimation,
  tracePaymentAnimationError,
} from "@/lib/payment-animation-trace";

export interface AnimationDomTraceContext {
  styleName: string;
  characterName?: string;
  surface?: string;
  bundleId?: string;
  cycleNumber?: number;
}

/** Shared DOM lifecycle tracing for animation style modules. */
export function traceAnimationDomMountAttempt(
  ctx: AnimationDomTraceContext,
  extra?: Record<string, unknown>
): void {
  if (!isPaymentAnimationTraceEnabled()) return;
  tracePaymentAnimation({
    stage: "animation_dom_mount_attempt",
    styleName: ctx.styleName,
    characterName: ctx.characterName,
    surface: ctx.surface,
    bundleId: ctx.bundleId,
    cycleNumber: ctx.cycleNumber,
    ...extra,
  });
}

export function traceAnimationDomMounted(
  el: Element,
  ctx: AnimationDomTraceContext,
  extra?: Record<string, unknown>
): void {
  if (!isPaymentAnimationTraceEnabled()) return;
  tracePaymentAnimation({
    stage: "animation_dom_mounted",
    styleName: ctx.styleName,
    characterName: ctx.characterName,
    surface: ctx.surface,
    bundleId: ctx.bundleId,
    cycleNumber: ctx.cycleNumber,
    ...extra,
  });
  traceDomVisibilitySnapshot(el, {
    styleName: ctx.styleName,
    characterName: ctx.characterName,
    surface: ctx.surface,
    bundleId: ctx.bundleId,
    cycleNumber: ctx.cycleNumber,
  });
}

export function traceAnimationDomNotMounted(
  ctx: AnimationDomTraceContext,
  reason: string
): void {
  if (!isPaymentAnimationTraceEnabled()) return;
  tracePaymentAnimation({
    stage: "animation_dom_not_mounted",
    styleName: ctx.styleName,
    characterName: ctx.characterName,
    result: reason,
  });
}

export function traceAnimationAssetLoad(
  succeeded: boolean,
  ctx: AnimationDomTraceContext,
  extra?: Record<string, unknown>
): void {
  if (!isPaymentAnimationTraceEnabled()) return;
  tracePaymentAnimation({
    stage: succeeded
      ? "animation_asset_load_succeeded"
      : "animation_asset_load_failed",
    styleName: ctx.styleName,
    characterName: ctx.characterName,
    ...extra,
  });
}

export function traceAnimationDomCleanup(
  el: Element | null,
  ctx: AnimationDomTraceContext,
  matchingSelector: string,
  phase: "started" | "completed"
): void {
  if (!isPaymentAnimationTraceEnabled()) return;
  const count = document.querySelectorAll(matchingSelector).length;
  tracePaymentAnimation({
    stage:
      phase === "started"
        ? "animation_dom_cleanup_started"
        : "animation_dom_cleanup_completed",
    styleName: ctx.styleName,
    characterName: ctx.characterName,
    matchingNodeCountBefore: phase === "started" ? count : undefined,
    matchingNodeCountAfter: phase === "completed" ? count : undefined,
    connectedToDocument: el?.isConnected,
  });
}

export function traceAnimationDomError(
  stage: "animation_dom_mount_attempt" | "animation_dom_cleanup_started",
  err: unknown,
  ctx: AnimationDomTraceContext
): void {
  tracePaymentAnimationError(stage, err, {
    styleName: ctx.styleName,
    characterName: ctx.characterName,
  });
}
