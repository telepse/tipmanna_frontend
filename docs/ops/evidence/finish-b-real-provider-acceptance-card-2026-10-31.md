# Real-provider acceptance card — Exp-05 / R2-10 (rev. 2026-10-31)

## Scope split (read first)

| Label | What this card proves |
| --- | --- |
| **R2-10 / LIVE-013 capability** | Real Daily composition: contributor join, programme-driven compositor job, **observable output**, rate transitions, teardown |
| **Full B1 / Finish B (LIVE-011–018)** | **Not** proved by this card alone — needs production UX second device, owner sign-off, superadmin branding walk, optional ingest, CI Playwright |

## Compatible revisions

Use **final RC SHAs** from `finish-b-rc-validation-2026-10-31.md` (FE + BE on `feature/pr-live-b1-finish-b`).

## Isolated environment

| Resource | Setting |
| --- | --- |
| Postgres | Disposable `127.0.0.1:5439` / `streaming_test` — **do not** touch Finish A |
| API / worker | `8014` stack; `STREAMING_PROVIDER_MODE=mock` until owner flips window |
| Provider window | `STREAMING_PROVIDER_MODE=real` on **API + worker** only during test |
| Ingest | **Off** (`NATIVE_STREAMING_INTERACTION_ALERT_INGEST_ENABLED=false`) unless separate LIVE-017 decision |
| Director lease | **Default 120s** — unset `STREAMING_DIRECTOR_LEASE_TTL_MS` |
| Daily room | **Dedicated** experiment room ID prefix (not Finish A staging rooms) |

## RTMP destination and pass criteria

### Primary path (Daily composition — R2-10)

| Item | Detail |
| --- | --- |
| **RTMP destination** | Daily-provided **publisher ingest URL** for the experiment room (from provider job / room API — owner vault) |
| **Observable pass** | After programme patch (e.g. `split`), evidence shows: (1) `StreamingProviderJob` success for real compositor, (2) **visible layout change** on Daily dashboard or subscribed test viewer / encoder preview, (3) optional HLS/RTMP tap if owner provides read-only monitor |
| **Fail** | Mock job only, unchanged layout, or provider error loop without recovery |

### Optional YouTube path (only if owner authorises)

| Item | Detail |
| --- | --- |
| **RTMP destination** | `rtmp://a.rtmp.youtube.com/live2/{stream-key}` (or current YouTube ingest URL from API bind) |
| **Observable pass** | YouTube **Live Control Room** or API poll: `streamStatus=active` **and** normalized `healthStatus` ∈ `{good, ok}` after encoder start; confirm-live does not crash on nested health payload (PR #139 parser on RC BE) |
| **Fail** | `inactive` / `noData` after budget, or confirm-live fault |

## Journey (minimal)

1. Seed disposable host/event/broadcast (existing B1 seed pattern).
2. Director: claim lease → create invite → **real** contributor join on second device.
3. Activate (standard → **advanced** 2×) → programme change → capture output proof.
4. Downgrade to standard → stop broadcast → provider teardown.

## Provider resource limits

| Limit | Value |
| --- | --- |
| Concurrent Daily rooms | **1** experiment room |
| Concurrent real compositor jobs | **1** active programme version at a time |
| Contributor slots | Product default (`ADVANCED_CONTRIBUTOR_SLOT_LIMIT`) |
| YouTube test broadcast | **0–1** optional; pre-created test asset only |

## Teardown (mandatory)

- Stop lifecycle worker; drain jobs.
- Delete Daily room; revoke experiment credentials per vault policy.
- YouTube: end broadcast + delete stream if used.
- DB: stop/dispose **5439 disposable** only.

## Duration and monetary budget

| Item | Value |
| --- | --- |
| **Wall clock (NEW PROPOSAL — not pre-approved owner cap)** | **≤ 90 minutes** engineer setup + one pass |
| **Paid provider window (NEW PROPOSAL — not pre-approved owner cap)** | **≤ 30 minutes** billable Daily/composition time |
| **Owner action before spend** | Explicit written approval of window + budget + credential injection |

## Next owner action

Approve Exp-05 **in writing**, supply Daily credentials (and optional YouTube test stream), assign second device operator — engineering keeps **mock + ingest off** until that approval.
