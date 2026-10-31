# Finish B — automated gates (2026-10-31)

**Phase 0 / physical-phone:** preserved — not repeated.  
**Shared PG:** `127.0.0.1:5439` and Finish A `5440` **not truncated**.

## Isolated disposable database (gates only)

| Target | Value |
| --- | --- |
| Container | `tipmanna-finish-b-gates-pg` |
| Host port | **`127.0.0.1:5441`** → `streaming_test` |
| Env | `STREAMING_TEST_DB_PORT=5441` |
| URL | `postgresql://streaming_test:streaming_test@127.0.0.1:5441/streaming_test` |

Connection guard in `streaming-integration-db-url.ts` rejects URLs whose port ≠ effective `STREAMING_TEST_DB_PORT`.

## HTTP integration (PostgreSQL @ 5441)

| Spec | Result | Notes |
| --- | --- | --- |
| `t-b1-advanced-http.spec.ts` | **1/1 PASS** | prepare → lease → invite → redeem → activate → downgrade |
| `t-b1-branding-superadmin-http.spec.ts` | **1/1 PASS** | superadmin PUT/GET → host `/advanced/branding` read-back |

Run (when Docker available):

```powershell
$env:STREAMING_TEST_DB_PORT="5441"
$env:STREAMING_INTEGRATION_DATABASE_URL="postgresql://streaming_test:streaming_test@127.0.0.1:5441/streaming_test"
# start container on 5441, prisma migrate deploy, then:
npm run test:streaming:integration -- src/services/streaming/__tests__/integration/t-b1-advanced-http.spec.ts src/services/streaming/__tests__/integration/t-b1-branding-superadmin-http.spec.ts
```

## Superadmin build + LIVE-016 contract

| Check | Result |
| --- | --- |
| `tipmanna_superadmin` @ `05f6a90` — `bun install` + `bun run build` | **PASS** (Vite production bundle) |
| HTTP branding contract (API) | **PASS** (integration spec above) |
| Real outbound text overlay on programme feed | **Open** — Exp-05 only |

## Production lifecycle worker (`dist`)

| Step | Command |
| --- | --- |
| Compile | `npx tsc` (or full `npm run build` before deploy) |
| Verify artifact | `npm run verify:streaming-lifecycle-worker-dist` |
| One-shot build+verify | `npm run build:streaming-lifecycle-worker-dist` |
| Production launch | **`npm run streaming:lifecycle-worker:dist`** only after verify **ok** |

Verified snippets in `dist/services/streaming/lifecycle/streaming-lifecycle-worker.js`: `enforceMaxStartingDurationStops`, `youtubeLiveStreamId`.

**Example (2026-10-31 gate run after `npx tsc`):**

- `workerTickSha256`: `ce1fb598d597e878993606d9b8b8e02f04d363f27f876e70d76407b8a0617293`
- `entrySha256`: `d9f0e3b3366d05b03c2d375bddd9598fdc2b9769768550fe5d7b48f75891761e`

**Acceptance / disposable:** `npm run streaming:lifecycle-worker` (ts-node) remains valid; **does not** substitute for dist verify.

## Playwright LIVE-014/018 (mock provider)

| Attempt | Result | Cause |
| --- | --- | --- |
| 2026-10-31 run A | **FAIL** (main journey) | Playwright **reused** existing `next dev` on `3014` aligned to **`8014`/5439** while seed + API were on **`8015`/5441** → sign-in page |
| 2026-10-31 run B | **Interrupted** | Port `3014` busy when `CI=1` forced fresh server |
| **Required retry** | Pending Docker + ports | `CI=1`, `PLAYWRIGHT_PORT=3016`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3016`, `PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8015`, `NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8015/api/v1`, seed on **5441**, API on **8015** |

Setup project + unauthenticated redirect test **passed** on run A; main journey blocked by frontend/backend port skew.

**2026-10-31 later:** Docker Desktop daemon **offline** — could not re-run Playwright in this session.

## Unit mock suites (unchanged, no PG)

Prior closeout: **22/22 PASS** (composition, RTMP contract, lease, studio client) — see `finish-b-rc-validation-2026-10-31.md`.
