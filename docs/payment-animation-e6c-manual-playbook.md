# Payment Animation E6C Manual Playbook

Use **development/staging only**. Do not generate real Stripe charges.

## Prerequisites

- `NEXT_PUBLIC_PAYMENT_ANIMATION_TRACE_ENABLED=true`
- `NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER=true` (or verify legacy path separately)
- Event with ≥3 tipping characters and valid animation styles

## Scenarios and pass criteria

| #   | Scenario                         | Pass criteria (measurable)                                                                   |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Same style twice in one bundle   | 2 characters queued; 2× `payment_character_playback_finished`; keys differ by name           |
| 2   | Multi-character bundle           | `payment_bundle_resolution_summary.expectedCount` = selected count                           |
| 3   | Event Room + Screen Display open | 1× `canonical_validated_tip_published`; 2× `validated_tip_listener_received` (room + screen) |
| 4   | 10 rapid wallet tips             | No queue stall; `queue_batch_pending_decremented` keeps advancing                            |
| 5   | Queue approaching capacity (20)  | `queuePendingCount` rises; no duplicate enqueue per surface per bundle                       |
| 6   | Queue full (21st batch)          | `queue_batch_rejected_full`; keys released for rejected batch only                           |
| 7   | Slow icon load                   | Character completes or `timed_out` — never false `payment_double_cycle_completed`            |
| 8   | Fast 3G throttling (DevTools)    | Queue continues; no permanent stall                                                          |
| 9   | Hidden tab 30s                   | Document `timed_out` or delayed completion; note browser limitation                          |
| 10  | Foreground recovery              | Next tip after focus animates                                                                |
| 11  | Pusher reconnect                 | Single `tip_handler_bound` after reconnect; no duplicate dispatch per bundle                 |
| 12  | Screen close with pending tasks  | Queue flushed; no playback after close                                                       |
| 13  | Screen reopen                    | First **new** tip after reopen animates; closed-period tips do not replay                    |
| 14  | Standalone `/room/:id/screen`    | Provider owns stream; Screen animates                                                        |
| 15  | Two tabs same event              | Each tab independent keys; no cross-tab committed key release                                |

## Browser limitations (record separately)

- Background tab timer throttling may extend `timed_out` outcomes.
- `requestAnimationFrame` pausing affects shake/float styles.

## Automated companion

Run `npm test -- payment-animation-stress-e6c` in `frontend/` for broker/queue synthetic checks.
