# Finish B — automated gates (2026-10-31, final)

**Phase 0 / phone:** preserved — not repeated. **5439 / 5440 / Finish A:** not truncated or reconfigured.

## Isolated stack (Playwright gate)

| Component | Target |
| --- | --- |
| Postgres | `tipmanna-finish-b-gates-pg` → **`127.0.0.1:5441`** / `streaming_test` |
| API | **`127.0.0.1:8015`** (`DATABASE_URL` → port **5441**; log: `[prisma] pool config: { port: '5441' }`) |
| Frontend | **`127.0.0.1:3016`** — **`npm run start`** (production build), **`CI=1`** (no reuse of **3014**) |
| Provider | **mock** (`STREAMING_PROVIDER_MODE=mock` via `.env.streaming.b1-e2e`) |

**Alignment proof:** Playwright run emitted server-action fetches to `http://127.0.0.1:8015/api/v1/events/...` (not 8014). FE build used `NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8015/api/v1`.

## Playwright LIVE-014/018 (production `next start`)

| Item | Value |
| --- | --- |
| FE revision | `f1ddb3305aa76f7c31d1f2279c5810e868b2d1be` |
| BE revision (API) | `9974d1ba22302c1a46df21c0d61c437f0ff73566` |
| Command | `CI=1 STREAMING_B1_E2E=1 PLAYWRIGHT_PORT=3016 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3016 PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8015 NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8015/api/v1 PLAYWRIGHT_WEB_SERVER_COMMAND="npm run start -- -p 3016" npx playwright test --project=setup-streaming-b1 --project=streaming-b1-chromium` |
| Pre-step | `npm run build` with same `NEXT_PUBLIC_BACKEND_API_URL`; re-seed **5441** immediately before test (do not run integration truncate between seed and Playwright) |
| **Exit code** | **0** |
| **Tests** | **3 passed** — setup auth, main journey, unauthenticated redirect |

## HTTP integration @ 5441

| Spec | Result |
| --- | --- |
| `t-b1-advanced-http.spec.ts` | **PASS** |
| `t-b1-branding-superadmin-http.spec.ts` | **PASS** |

## Backend executable delta (`2f2e64c` → `9974d1b`)

See **`finish-b-backend-executable-delta-9974d1b.md`**. Not docs-only.

## Worker dist (production path)

After `npx tsc`: `npm run verify:streaming-lifecycle-worker-dist` **PASS** (`workerTickSha256` `ce1fb598…`).

## LIVE-016 evidence split

| Layer | Result |
| --- | --- |
| **HTTP contract** (superadmin PUT/GET → host `/advanced/branding`) | **PASS** — integration spec |
| **Superadmin SPA build** @ `05f6a90` | **PASS** (`bun run build`) |
| **Superadmin browser editor** (save in SPA UI) | **Not automated** — no Playwright in superadmin repo; real outbound overlay still **open** |
| **Host preview in browser** | **PASS** — Playwright journey (`stream-branding-preview` visible) |

## Operator notes

- Seed: `STREAMING_INTEGRATION_DATABASE_URL` to **5441**; port auto-derived in `streaming-b1-e2e-seed.ts` after fix on branch.
- First Playwright failure modes resolved: missing `npx playwright install chromium`; stale seed after integration `truncate`; **3014/8014 reuse** — use **3016/8015/5441** only.
