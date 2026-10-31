# Finish B release-candidate validation (2026-10-30)

**Phase 0:** CLOSED — evidence retained; Walk A/B and phone isolation **not** re-run.

## Candidate pins (preserved)

| Repo     | SHA                                        |
| -------- | ------------------------------------------ |
| Frontend | `9fa64a9ce218b2e7d6f1f925da6f456a15541d70` |
| Backend  | `9014c88c84b4cdfcf9f159c5029c186d062a1e84` |

## RC engineering delta (local, not pushed)

Uncommitted on restore worktrees — intended **next** commits on `feature/pr-live-b1-finish-b`:

| Area                | Files                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BE lease tests      | `advanced-studio.config.spec.ts` (new), `director-lease.policy.spec.ts`, `advanced-session.policy.spec.ts`, `advanced-studio.service.spec.ts`                |
| FE lockfile hygiene | `package-lock.json` (preserved dirty copy — valid JSON; **committed** tree at `9fa64a9` is corrupt)                                                          |
| Evidence / PR       | `finish-b-rc-validation-2026-10-30.md`, `finish-b-rc-pr-package-2026-10-30.md`, `finish-b-real-provider-acceptance-card-2026-10-30.md`, Phase 0 closeout set |

## Validation matrix

| Check                                            | Result            | Notes                                                                      |
| ------------------------------------------------ | ----------------- | -------------------------------------------------------------------------- |
| BE director lease policy (120s expiry + reclaim) | **PASS**          | 5 vitest cases incl. product TTL                                           |
| BE config default `120_000` ms                   | **PASS**          | `advanced-studio.config.spec.ts`                                           |
| BE activate blocks expired lease                 | **PASS**          | `DIRECTOR_LEASE_REQUIRED`                                                  |
| BE advanced-session policy                       | **PASS**          | 6 tests (reuse Phase 0 count +1)                                           |
| BE unit suite (focused lease RC)                 | **PASS**          | 17/17 on restore worktree                                                  |
| FE vitest (Phase 0 pin tests)                    | **PASS (reuse)**  | Same paths as Phase 0 — 9 tests at closeout                                |
| FE `npm ci` at **exact** `9fa64a9` lockfile      | **BLOCKER**       | Committed lock missing opening `{`; npm parse error                        |
| FE `npm ci` with **preserved** valid lockfile    | **PASS**          | Detached `finish-b-rc-wt-fe` — 765 packages                                |
| FE vitest (re-run 2026-10-30 RC)                 | **PASS**          | 9/9 same paths as Phase 0                                                  |
| FE typecheck (restore WT)                        | **PASS**          | `tsc --noEmit`                                                             |
| FE typecheck (clean WT + valid lock)             | **PASS**          | `finish-b-rc-wt-fe` after `npm ci`                                         |
| FE production build (clean)                      | **PENDING**       | Acceptance env stubs                                                       |
| BE `npm ci` (detached `9014c88`)                 | **FAIL (retry)**  | `ECONNRESET` during install — retry on idle network                        |
| BE typecheck (`npm run typecheck`)               | **BLOCKED (env)** | Prisma `EPERM` while stack running; `tsc --noEmit` **PASS** on restore WT  |
| BE production build (restore WT)                 | **PASS**          | `npm run build` exit 0 (2026-10-30)                                        |
| Shared DB / Finish A                             | **Not touched**   |                                                                            |
| 120s lease product policy                        | **Unchanged**     | 15m phone journey documented in Phase 0 only                               |

## Release-candidate verdict

**CONDITIONAL PASS** — engineering ready pending:

1. **Commit** FE `package-lock.json` hygiene (valid lock replaces corrupt blob at `9fa64a9`).
2. **Commit** BE lease RC tests + evidence docs.
3. Retry detached BE **`npm ci`**; optional clean FE **build** on `finish-b-rc-wt-fe`.

Until (1) is merged, reproducible install at candidate SHA alone is **FAIL**.

## Migrations

No **new** migrations after `9014c88`. Disposable acceptance continues to use existing `streaming_test` migrate deploy on **5439** only.

## YouTube / Finish A parser path

If real test uses YouTube RTMP: candidate branch **includes** recovered lifecycle/parser commits on B (`youtube-broadcast-transition.util`, confirm-live orchestration, adapter). Finish A runtime **not** modified.
