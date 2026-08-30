# Payment Animation Overload Policy (Temporary Defaults)

**Status:** Documentation-only policy lock (Phase E6B). No runtime behaviour changes in this document.

**Last updated:** 2026-07-18

## Approved temporary defaults

1. **Two cycles per successful character** — preserved; no reduction under overload.
2. **Queue capacity** — remains **20** batches per surface (`MAX_QUEUED_BATCHES`).
3. **Queue-full behaviour** — remains current implementation: reject incoming batch, release reserved keys for that batch, trace `queue_batch_rejected_full`.
4. **No cycle reduction under overload** — deferred.
5. **No animation duration compression** — deferred.
6. **No persistence or replay** — transient animations are not stored or replayed.
7. **Screen Display closed-period animations** — permanently missed; never replayed after reopen.
8. **Background-tab behaviour** — remains current until measured in E6C.
9. **Late-character handling** — remains current; every skip/failure must be explicit via E3C outcomes and E5 resolution summary.
10. **Permanent policy optimisation** — deferred until E6C evidence exists.

## Unresolved product decisions (require explicit approval before runtime change)

| Topic                                  | Options                                                          | Current behaviour                                           |
| -------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Maximum acceptable queue wait          | unbounded / 30s / 60s / other                                    | Unbounded until queue cap                                   |
| Queue-full policy                      | drop newest (current) / drop oldest / reject with operator alert | Drop newest batch                                           |
| Late multi-character fairness          | always play / skip late / shorten                                | Always attempt; segment budget may skip with explicit trace |
| Duplicate same-character playback keys | `<bundleId>-<name>` collision                                    | Keys collide; format unchanged pending product decision     |
| Background-tab segment expiry          | continue / expire / shorten                                      | Continue (browser timer throttling unmeasured)              |
| Operator alerts on queue-full          | none / dashboard / webhook                                       | None wired                                                  |

## Related invariants (E1–E3B, must not change without programme review)

- One backend animation bundle per successful wallet/Stripe payment.
- Independent Event Room and Screen Display queues.
- Playback keys: `unseen → reserved → committed`; committed keys are not released after failure.
- Pusher: channel `global-live-tv`, event `tip-animation`.
- No automatic animation fallback for unknown styles.

## Evidence dependencies

- **E6C** stress harness should measure queue wait, execution duration, and background-tab behaviour before changing any row in the unresolved table.
- **E7** observability should add operator-visible signals for queue-full and failure outcomes before enabling alerts.

## Rollback

Revert only this file if policy text is incorrect. Runtime behaviour is unchanged by E6B.
