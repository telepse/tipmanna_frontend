# Real-provider acceptance card — owner approval required

**Status:** Proposal only — **not approved.** Prior “90 min wall / 30 min paid” figures were **not** signed off; replace with owner-approved caps below.

## Scope split

| Label | Proves |
| --- | --- |
| **R2-10 / LIVE-013** | One real Daily room: contributor publishers, **one** outbound RTMP instance, programme layout/media on **programme output**, billing standard↔advanced, teardown + usage evidence |
| **Full B1 / Finish B** | Superadmin LIVE-016 UI walk, Playwright disposable E2E, ingest (LIVE-017), production UX — **outside** minimal R2-10 window |

## Revisions (no credentials)

| Component | SHA |
| --- | --- |
| Host FE | `ab374ff513dd57e7c309e1e6109e130ba261aa79` |
| API + worker | `b4a52bf56fdad72b2302802a762208c6e374f6ea` |
| Superadmin | `05f6a90bf81a7029daa34bc89aae6ca7faa7630a` |

## Exact output destination and viewer

| Item | Requirement |
| --- | --- |
| **Outbound RTMP ingest (layer 3)** | Owner vault: **YouTube Live test broadcast** ingest URL `rtmp://a.rtmp.youtube.com/live2/{stream-key}` **or** dedicated RTMP/HLS tap (e.g. restream.io test endpoint) |
| **Primary viewer / proof surface** | **YouTube Live Control Room** preview (test broadcast, unlisted) **or** tap’s programme monitor — must show **composed programme**, not in-room self-preview only |
| **Composition API (layer 2)** | `POST …/rooms/{room}/live-streaming/update` per `daily-live-composition.adapter.ts` + unit tests |
| **RTMP start (layer 3)** | `POST …/live-streaming/start` with `endpoints: [{ endpoint }]` per `daily-rtmp-streaming.adapter.ts` |

## Mandatory sequencing (R2-10)

1. **Start exactly one** outbound RTMP instance (`live-streaming/start`) to the approved destination **before** programme layout patches that must appear on air.
2. Confirm ingest **active** on viewer (YouTube “Stream active” / tap equivalent).
3. **Second device:** contributor redeem invite — WebRTC publishers in room (layer 1).
4. Director: **standard → advanced** activate — capture billing (ledger/UI **2×**).
5. Programme: `camera_a` → `split` → `camera_b` — **visible layout change on programme output viewer**.
6. (Optional) Superadmin branding slot edit → text overlay on programme output when rotation active — **still open** for full B1.
7. **Advanced → standard** downgrade — billing reverts.
8. Teardown: `live-streaming/stop`, end/delete YouTube test asset, delete Daily room, worker drain.

## Billing transitions (pass criteria)

| Step | Evidence |
| --- | --- |
| Pre-activate | Rate **standard** in UI/API |
| Post-activate | Rate **advanced** / consumption **2×** per product rules |
| Post-downgrade | Rate **standard**; reservations/ledger consistent |

## External cleanup evidence

- Daily dashboard: room deleted; live-streaming minutes noted.
- YouTube: broadcast ended; stream binding removed if created for test.
- Screenshots or API audit log attached to Exp-05 ticket (no secrets).

## Resource limits (technical)

| Limit | Value |
| --- | --- |
| Daily experiment rooms | **1** |
| Concurrent outbound RTMP instances | **1** |
| Real compositor/update jobs | **1** active programme version |
| Contributors | Product default slot limit |

## Duration and monetary budget — **owner must approve in writing**

| Field | Engineering proposal (not approved) |
| --- | --- |
| Engineer wall clock | Up to **120 minutes** one supervised pass |
| Billable Daily live-streaming minutes | Up to **45 minutes** |
| YouTube | Single pre-created **test** broadcast only |
| **Hard stop** | Owner-named operator aborts on budget exceed |

Do **not** incur provider charges until approval email/ticket references this card revision and approved caps.

## Environment

- Dedicated Daily room prefix (not Finish A staging).
- `STREAMING_PROVIDER_MODE=real` on API + worker during window only.
- Production worker: **`npm run build:streaming-lifecycle-worker-dist`** then `streaming:lifecycle-worker:dist` — not ts-node alone.
- Postgres: disposable gate DB pattern (`5441` class) or owner staging — **never** truncate shared Phase 0 `5439` or Finish A `5440`.

## Automated gates already green (mock / isolated)

See `finish-b-automated-gates-2026-10-31.md` — HTTP integration @ **5441**, superadmin build, worker dist verify, unit mocks. **Playwright disposable journey:** retry pending (port alignment + Docker).

## Next owner action

Approve **budget caps**, **RTMP destination**, **viewer**, and credential injection — then schedule Exp-05 (R2-10 only).
