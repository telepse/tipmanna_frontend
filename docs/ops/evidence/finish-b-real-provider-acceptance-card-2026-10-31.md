# Real-provider acceptance card — Exp-05 (proposal only)

**Not approved.** Automated mock/isolated gates are **green** (see `finish-b-automated-gates-2026-10-31.md`); this card is for **paid** Daily/YouTube window only.

## Scope

| Track | Proves |
| --- | --- |
| **R2-10** | One real room, second-device contributor, **one** RTMP out, programme layout on **programme** viewer, billing standard↔advanced↔standard, teardown |
| **Full Finish B** | Superadmin SPA editor walk, outbound branding overlay, LIVE-017 ingest — **not** in R2-10 minimum |

## Revisions

FE `f1ddb33…` · BE `9974d1b…` · Superadmin `05f6a90…`

## Output destination and viewer

| Item | Value |
| --- | --- |
| **Destination** | Pre-created **YouTube Live test** ingest `rtmp://a.rtmp.youtube.com/live2/{stream-key}` (unlisted) |
| **Viewer** | **YouTube Live Control Room** programme preview (primary); optional read-only RTMP monitor as secondary |
| **Ordering** | **`live-streaming/start` once** → confirm active ingest → then `live-streaming/update` programme changes |

## Second device

Contributor redeems invite → joins Daily room (WebRTC). Director on primary device. Evidence: two publishers in Daily dashboard + contributor tile in Advanced Studio.

## Billing evidence

Screenshots or API reads: rate **standard** pre-activate → **advanced** post-activate → **standard** post-downgrade; ledger/reservation rows if exposed to operator.

## External cleanup checks

- Daily: `live-streaming/stop`, delete experiment room, usage minutes screenshot.
- YouTube: end test broadcast, delete stream binding.
- Finance note: attach provider usage export (no secrets).

## Duration — why proposal increased (90/30 → 120/45)

| Factor | Effect on estimate |
| --- | --- |
| Production-style server-action retries (429) observed in Playwright | Real window needs backoff headroom |
| Cold RTMP bind + YouTube health polling | +10–15 min engineer time |
| Second-device coordination + programme proofs | +15–20 min wall clock |
| Contingency for one failed attempt | +30 min wall / +15 min Daily |

**Neither 90/30 nor 120/45 is approved** — numbers are **proposals**.

## Minimum justified proposal (engineering)

| Cap | Value |
| --- | --- |
| Wall clock (single supervised pass) | **75 minutes** minimum justified |
| Billable Daily live-streaming | **35 minutes** minimum justified |
| **Proposed USD ceiling (unapproved)** | **$40 USD** all-in provider + eng overhead placeholder (reconcile to Daily list price × 35 min + YouTube $0 test) |

## Stop conditions

- Any cap above exceeded.
- RTMP inactive after **10 minutes** from start attempt.
- Provider error loop without recovery after **3** attempts.
- Owner or operator abort.

## Environment constraints

Dedicated Daily room; `STREAMING_PROVIDER_MODE=real` on API + worker; worker launch **`npm run build:streaming-lifecycle-worker-dist`** then `streaming:lifecycle-worker:dist`; **no** shared 5439/5440 mutation.

## LIVE-016 vs real overlay

- **Automated:** HTTP branding contract + host preview (Playwright) — **done**.
- **Open:** Superadmin SPA save in browser + **programme** text overlay on YouTube viewer.
