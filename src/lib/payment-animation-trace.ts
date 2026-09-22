/**
 * Structured diagnostics for payment-animation pipeline (browser).
 * Enabled only when NEXT_PUBLIC_PAYMENT_ANIMATION_TRACE_ENABLED === "true".
 */

export type PaymentAnimationTraceStage =
  | "channel_acquire_requested"
  | "channel_acquired"
  | "channel_ref_count_incremented"
  | "tip_handler_bound"
  | "tip_handler_unbound"
  | "channel_ref_count_decremented"
  | "raw_tip_animation_received"
  | "event_id_filter_accepted"
  | "event_id_filter_rejected"
  | "guard_accepted"
  | "guard_rejected"
  | "validated_tip_dispatched"
  | "validated_tip_listener_received"
  | "screen_display_open_requested"
  | "screen_display_open_committed"
  | "screen_display_stream_enabled"
  | "screen_display_queue_enabled"
  | "screen_display_ready"
  | "screen_display_close_requested"
  | "screen_display_stream_disabled"
  | "screen_display_queue_flushed"
  | "screen_display_closed"
  | "screen_display_reopen_started"
  | "screen_display_reopen_ready"
  | "screen_overlay_ready"
  | "character_resolution_started"
  | "resolved_tips_path_selected"
  | "resolved_tips_rejected_unknown_style"
  | "resolved_tips_rejected_missing_icon"
  | "resolved_tips_rejected_length_mismatch"
  | "local_map_fallback_started"
  | "local_character_matched"
  | "local_character_unresolved"
  | "character_resolution_completed"
  | "character_resolution_empty"
  | "character_resolution_partial"
  | "style_lookup_started"
  | "style_registry_match"
  | "style_registry_unknown"
  | "empty_handle_returned"
  | "style_factory_created"
  | "payment_character_style_preflight_started"
  | "payment_character_style_preflight_accepted"
  | "payment_character_rejected_unknown_style"
  | "payment_bundle_style_preflight_completed"
  | "payment_bundle_no_runnable_characters"
  | "payment_character_factory_rejected_unknown_style"
  | "playback_key_reservation_requested"
  | "playback_key_reserved"
  | "playback_key_duplicate_reserved"
  | "playback_key_duplicate_committed"
  | "playback_key_released_queue_disabled"
  | "playback_key_released_queue_full"
  | "playback_key_released_generation_abort"
  | "playback_key_released_flush"
  | "playback_key_committed_task_started"
  | "create_message_request_correlated"
  | "playback_task_created"
  | "playback_task_offered_to_queue"
  | "queue_batch_offered"
  | "queue_batch_accepted"
  | "queue_batch_rejected_disabled"
  | "queue_batch_rejected_full"
  | "queue_batch_pending_incremented"
  | "queue_batch_started"
  | "queue_task_started"
  | "queue_task_completed"
  | "queue_task_failed"
  | "queue_generation_invalidated"
  | "queue_batch_aborted_generation"
  | "queue_batch_pending_decremented"
  | "queue_flushed"
  | "queue_advanced"
  | "payment_cycle_started"
  | "animation_factory_invoked"
  | "animation_handle_returned"
  | "animation_handle_invalid"
  | "animation_finished_resolved"
  | "animation_finished_rejected"
  | "animation_safety_timeout"
  | "animation_stop_invoked"
  | "payment_cycle_completed"
  | "payment_cycle_finished"
  | "payment_cycle_failed"
  | "payment_character_playback_finished"
  | "payment_segment_budget_skipped"
  | "payment_double_cycle_completed"
  | "animation_dom_mount_attempt"
  | "animation_dom_mounted"
  | "animation_dom_not_mounted"
  | "animation_asset_load_succeeded"
  | "animation_asset_load_failed"
  | "animation_dom_visibility_snapshot"
  | "animation_dom_cleanup_started"
  | "animation_dom_cleanup_completed"
  | "pusher_runtime_identity"
  | "spin_factory_entered"
  | "spin_natural_timer_scheduled"
  | "spin_finish_entered"
  | "spin_finish_resolved"
  | "payer_recovery_state_saved"
  | "payer_recovery_exchange_started"
  | "payer_recovery_exchange_completed"
  | "payer_recovery_exchange_failed"
  | "payer_recovery_origin_detected"
  | "payer_recovery_claim_started"
  | "payer_recovery_claim_completed"
  | "payer_recovery_local_enqueue"
  | "payer_recovery_realtime_won"
  | "payer_recovery_occurrence_started"
  | "payer_recovery_occurrence_completed"
  | "payer_recovery_occurrence_failed"
  | "payer_recovery_lease_renewed"
  | "payer_recovery_session_completed"
  | string;

export interface PaymentAnimationTracePayload {
  stage: PaymentAnimationTraceStage;
  timestamp?: number;
  environment?: string;
  eventId?: string;
  transactionId?: string;
  maskedPaymentIntentId?: string;
  bundleId?: string;
  seq?: number;
  serverTs?: number;
  surface?: string;
  selectedTips?: string[];
  characterName?: string;
  styleName?: string;
  iconPresent?: boolean;
  playbackKey?: string;
  cycleNumber?: number;
  queuePendingCount?: number;
  queueGeneration?: number;
  queueEnabled?: boolean;
  result?: string;
  rejectionReason?: string;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
  previousSeq?: number;
  previousServerTs?: number;
  isOpen?: boolean;
  streamEnabled?: boolean;
  handlerBound?: boolean;
  previousState?: string;
  resultingState?: string;
  lookupStyleName?: string;
  registryKey?: string;
  factoryName?: string;
  mode?: string;
  chosenSource?: "server" | "local" | "unresolved";
  localMapLookupName?: string;
  serverStyleName?: string | null;
  localStyleName?: string | null;
  taskCount?: number;
  maxBatchCount?: number;
  capturedGeneration?: number;
  currentGeneration?: number;
  rejectedCount?: number;
  runnableCount?: number;
  playbackKeyState?: string;
  reason?: string;
  cycleOutcome?: string;
  playbackResult?: string;
  cycle1Outcome?: string;
  cycle2Outcome?: string;
  channel?: string;
  eventName?: string;
  cluster?: string;
  maskedKeySuffix?: string;
  domTagName?: string;
  domId?: string;
  domClassName?: string;
  parentTag?: string;
  parentId?: string;
  computedZIndex?: string;
  boundingWidth?: number;
  boundingHeight?: number;
  computedOpacity?: string;
  computedVisibility?: string;
  computedDisplay?: string;
  connectedToDocument?: boolean;
  matchingNodeCountBefore?: number;
  matchingNodeCountAfter?: number;
  occurrenceId?: string;
  claimId?: string;
  deliverySource?: string;
  [key: string]: unknown;
}

const PREFIX = "[PAYMENT_ANIMATION_TRACE]";

export function isPaymentAnimationTraceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENT_ANIMATION_TRACE_ENABLED === "true";
}

export function maskId(value: string | null | undefined): string | undefined {
  if (!value || typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= 6) return `***${trimmed}`;
  return `***${trimmed.slice(-6)}`;
}

export function tracePaymentAnimation(
  payload: PaymentAnimationTracePayload
): void {
  if (!isPaymentAnimationTraceEnabled()) return;
  if (typeof window === "undefined") return;
  try {
    const line = JSON.stringify({
      ...payload,
      timestamp: payload.timestamp ?? Date.now(),
      environment: payload.environment ?? process.env.NODE_ENV ?? "unknown",
    });
    console.info(PREFIX, line);
  } catch (err) {
    console.info(PREFIX, payload.stage, String(err));
  }
}

export function tracePaymentAnimationError(
  stage: PaymentAnimationTraceStage,
  err: unknown,
  partial?: Omit<PaymentAnimationTracePayload, "stage">
): void {
  if (!isPaymentAnimationTraceEnabled()) return;
  const e = err instanceof Error ? err : new Error(String(err));
  tracePaymentAnimation({
    stage,
    result: "error",
    errorName: e.name,
    errorMessage: e.message,
    stack: e.stack,
    ...partial,
  });
}

export function traceDomVisibilitySnapshot(
  el: Element | null | undefined,
  partial: Omit<PaymentAnimationTracePayload, "stage">
): void {
  if (!isPaymentAnimationTraceEnabled() || !el || typeof window === "undefined")
    return;
  try {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement;
    tracePaymentAnimation({
      stage: "animation_dom_visibility_snapshot",
      domTagName: el.tagName,
      domId: el.id || undefined,
      domClassName: el.className?.toString?.() || undefined,
      parentTag: parent?.tagName,
      parentId: parent?.id || undefined,
      computedZIndex: style.zIndex,
      boundingWidth: rect.width,
      boundingHeight: rect.height,
      computedOpacity: style.opacity,
      computedVisibility: style.visibility,
      computedDisplay: style.display,
      connectedToDocument: el.isConnected,
      ...partial,
    });
  } catch (err) {
    tracePaymentAnimationError(
      "animation_dom_visibility_snapshot",
      err,
      partial
    );
  }
}

export function tracePusherRuntimeIdentity(channel: string): void {
  if (!isPaymentAnimationTraceEnabled()) return;
  tracePaymentAnimation({
    stage: "pusher_runtime_identity",
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    maskedKeySuffix: maskId(process.env.NEXT_PUBLIC_PUSHER_KEY),
    channel,
    eventName: "tip-animation",
  });
}
