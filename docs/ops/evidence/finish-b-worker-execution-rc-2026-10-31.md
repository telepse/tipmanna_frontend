# Finish B — lifecycle worker execution path (2026-10-31)

## Question

Does Finish B load a **fresh** worker implementation (YouTube stream ID on transition-live, max-starting enforcement), and does PR #142 (Finish A dist repair) need integration on B?

## B disposable / acceptance launcher (authoritative for B1 stack)

| Item        | Value                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| npm script  | `streaming:lifecycle-worker`                                                                          |
| Command     | `ts-node src/workers/streaming-lifecycle-worker.entry.ts`                                             |
| Source tick | `runStreamingLifecycleWorkerTick` in `src/services/streaming/lifecycle/streaming-lifecycle-worker.ts` |

**Effect:** Each process start executes **TypeScript source**, not a prebuilt `dist/` artifact. Stale compiled output (Finish A failure mode) **does not apply** when operators use this script for disposable `8014` acceptance.

## Required behaviors present in source @ `b4a52bf…`

| Behavior                                         | Location                                                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Max **starting** duration stops                  | `enforceMaxStartingDurationStops` imported and invoked each tick                                                  |
| YouTube **live stream ID** on confirm/transition | `youtubeLiveStreamId: row?.providerYoutubeLiveStreamId` (and prepare fallback) on transition-live path            |
| Daily RTMP out                                   | `daily-rtmp-streaming.adapter.ts` → `POST …/live-streaming/start` with `endpoints[].endpoint` = outbound RTMP URL |
| Daily programme layout                           | `daily-live-composition.adapter.ts` → `POST …/live-streaming/update`                                              |

Spot-check: `dist/services/streaming/lifecycle/streaming-lifecycle-worker.js` on restore worktree aligns with source when `npm run build` has been run locally; **do not** assume dist freshness without build.

## PR #142 (`telepse/tipmanna_server` #142, Finish A head ~`58538cf`)

| Check                       | Result                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| Ancestor of B RC `b4a52bf`? | **No** — Finish A–specific dist stamp / `build:finish-a-worker` scripts **not** on B `package.json` |
| Finish A modified?          | **No** — out of scope for this closeout                                                             |

## Production launch path (required for deploy / Exp-05 worker)

| Order | Command |
| --- | --- |
| 1 | `npm run build:streaming-lifecycle-worker-dist` |
| 2 | `npm run streaming:lifecycle-worker:dist` |

Verify script: `npm run verify:streaming-lifecycle-worker-dist` — requires `enforceMaxStartingDurationStops` and `youtubeLiveStreamId` in compiled worker tick. Record SHA256 from script JSON in gate evidence.

**Disposable acceptance:** `npm run streaming:lifecycle-worker` (ts-node) — does **not** substitute for dist verify.

**Verdict:** PR #142 (Finish A) **not** on B; use B verify script above.

## Automated evidence (mock, no PG 5439)

| Suite                                        | Result                             |
| -------------------------------------------- | ---------------------------------- |
| `daily-rtmp-worker.mock.spec.ts`             | **PASS**                           |
| `daily-rtmp-streaming.real.adapter.spec.ts`  | **7/7 PASS** (HTTP contract mocks) |
| `daily-live-composition.adapter.spec.ts`     | **3/3 PASS**                       |
| `advanced-compositor.worker-handler.spec.ts` | **2/2 PASS**                       |
| `director-lease.policy.spec.ts`              | **5/5 PASS**                       |
| `advanced-studio.service.spec.ts`            | **3/3 PASS**                       |

`t-b1-advanced-http.spec.ts` **not run** — requires `STREAMING_INTEGRATION_DATABASE_URL` and **truncates** streaming tables; defer until isolated PG port/fixture (not shared 5439).
