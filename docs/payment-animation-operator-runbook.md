# Payment Animation Operator Runbook (Phase E7)

**Scope:** Browser payment-animation pipeline after E3C–E6C.  
**Production trace flags (defaults):**

- `PAYMENT_ANIMATION_TRACE_ENABLED=false` (backend)
- `NEXT_PUBLIC_PAYMENT_ANIMATION_TRACE_ENABLED=false` (frontend)

Do not enable verbose trace in production without an incident ticket.

## Permanent signals (grep-friendly)

| Signal                                | Source                      | When                                  |
| ------------------------------------- | --------------------------- | ------------------------------------- |
| `[TipmannaRealtime]` JSON             | Browser console / log drain | tip receive, guard, dispatch, enqueue |
| `canonical_validated_tip_published`   | Payment animation trace     | One per accepted bundle (broker path) |
| `payment_bundle_resolution_summary`   | Payment animation trace     | Per bundle resolution                 |
| `payment_character_playback_finished` | Payment animation trace     | Every character task outcome          |
| `payment_cycle_finished`              | Payment animation trace     | Every attempted cycle                 |
| `queue_batch_rejected_full`           | Payment animation trace     | Queue cap hit                         |
| `guard_rejected`                      | Payment animation trace     | Stale/duplicate bundle                |

## Failure grep patterns

```text
"stage":"guard_rejected"
"stage":"queue_batch_rejected_full"
"stage":"payment_character_rejected_unknown_style"
"stage":"payment_cycle_finished".*"timed_out"
"stage":"payment_character_playback_finished".*"failed"
"event":"tip_animation_rejected"
```

## Suggested alert thresholds (initial)

- `queue_batch_rejected_full` > 0 in 5 minutes on a live event → investigate burst load.
- `guard_rejected` with `stale_server_timestamp` spike after deploy → clock/skew or delayed Pusher delivery.
- `payment_character_playback_finished` with `failed` > 10% of attempts in 15 minutes → style/asset regression.

## Pusher identity verification

1. Confirm frontend env: `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`.
2. In browser devtools, grep logs for `pusher_runtime_identity` (trace enabled) or `[Pusher] connected`.
3. Verify subscription to `global-live-tv` with event `tip-animation` — exactly **one** bind per page when `NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER` is enabled (default outside production).

## Screen Display smoke procedure

1. Open Event Room with Screen Display closed; send wallet tip in development — Event Room animates, Screen does not enqueue.
2. Open Screen Display; send new tip — both surfaces animate once each.
3. Close Screen Display; send tip — Event Room only.
4. Reopen Screen Display; send tip — first post-reopen tip must animate on Screen.

## Production database read-only audit (development/staging only in this repo)

Use existing backend read paths only. Example checks:

- Recent messages with `transactionId` — one animation emit per claimed transaction (E1).
- Animation style catalog — canonical names only (E3B).

**Do not run destructive migrations or production seeds from this runbook.**

## Rollback checklist

| Phase | Rollback boundary                                                                   |
| ----- | ----------------------------------------------------------------------------------- |
| E3C   | Revert `wrapPaymentAnimation.ts`, `payment-animation-outcomes.ts`                   |
| E4    | Set `NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER=false`; restore dual `useGlobalTipStream` |
| E5    | Revert `tip-animation-characters.ts` per-character resolution                       |
| E6A   | Revert budget formula + screen-shake overlay scoping                                |
| E6B   | Documentation only                                                                  |
| E6C   | Remove/disable stress spec from CI                                                  |
| E7    | Re-enable verbose trace flags temporarily                                           |

## Post-deployment monitoring (48h)

- Wallet + Stripe tip on staging with both surfaces open.
- Queue depth traces during burst (10+ rapid tips).
- Zero `canonical_validated_tip_published` duplicates per bundle seq.
- No Screen Display closed-period replay reports.

## Sampling policy

- Log **100%** of failures, queue drops, guard rejections, and resolution omissions.
- Sample successful cycle completions conservatively in production telemetry extensions (future E7 wiring to APM).

## PII / secrets

- Do not log sender information, payment amounts in verbose trace, or raw Stripe identifiers.
- Use existing masking utilities for bundle/transaction correlation in logs.
