# Backend executable delta — `2f2e64c` → `9974d1b`

**Label:** This range includes **executable and test code**, not documentation-only changes.

## Files changed (executable)

| Path | Purpose |
| --- | --- |
| `package.json` | `verify:streaming-lifecycle-worker-dist`, `build:streaming-lifecycle-worker-dist`, `streaming:lifecycle-worker:dist` |
| `scripts/verify-streaming-lifecycle-worker-dist.mjs` | Pre-launch dist guard for worker tick |
| `streaming-ops-http-test-app.ts` | Wire branding GET/PUT for integration tests |
| `t-b1-branding-superadmin-http.spec.ts` | LIVE-016 HTTP gate |
| `scripts/streaming-b1-e2e-seed.ts` | Gates PG port alignment (dynamic truncate import) |

## Validation performed @ `9974d1b`

| Check | Scope | Result |
| --- | --- | --- |
| `npx tsc` | Full backend TypeScript compile → `dist/` | **PASS** (used for gate; full `npm run build` includes repo-wide format) |
| `verify:streaming-lifecycle-worker-dist` | Compiled `streaming-lifecycle-worker.js` snippets + SHA256 | **PASS** |
| `test:streaming:integration` | `t-b1-advanced-http`, `t-b1-branding-superadmin-http` on **5441** | **2/2 PASS** |
| Unit mocks (prior tranche) | composition, RTMP, lease, studio | **22/22 PASS** @ RC |

**What `npx tsc` alone does not prove:** ESLint/format, Prisma migrate on deploy, or every integration file in the suite — only that TypeScript emits. **Worker dist verify** narrows proof to lifecycle worker artifacts required for production launch.

## Prior build pin

Clean `npm ci` / typecheck / `build` at **`2f2e64c`** remains valid for the pre-gate tree; **`9974d1b` adds** the rows above — re-validate with integration + dist verify (done), not necessarily full monorepo `npm run build` (avoid unrelated dist churn in dirty worktree).
