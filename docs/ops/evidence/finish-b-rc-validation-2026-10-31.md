# Finish B RC validation — final (2026-10-31)

**Phase 0:** CLOSED (not re-run). **Provider:** mock + ingest off. **Finish A:** not touched.

## Final RC SHAs (`feature/pr-live-b1-finish-b`)

| Repo | Full SHA | Summary |
| --- | --- | --- |
| **Frontend** | `54fd8fe093f110d4f003013dc881f5f04c5e4f33` | Lockfile repair + RC evidence |
| **Backend** | `2f2e64cc6711f5b9920f308c6c5b921c95a23b54` | PR #139 YouTube parser + 120s lease tests + evidence |

**Prior pins preserved in history:** FE `9fa64a9…`, BE `9014c88…`.

## Clean isolated checkout validation

Worktrees: `finish-b-rc-val-fe-1031`, `finish-b-rc-val-be-1031` (detached at SHAs above).  
**No pre-existing `node_modules`.** Steps run **sequentially** (FE complete before BE).

| Step | FE | BE |
| --- | --- | --- |
| `npm ci` (fresh) | **PASS** (765 packages) | **PASS** (428 packages; postinstall `prisma generate`) |
| `npm run typecheck` | **PASS** | **PASS** |
| `npm run build` | **PASS** | **PASS** |

## Regression tests (final SHAs)

| Suite | Result |
| --- | --- |
| FE vitest (Phase 0 paths) | **9/9 PASS** |
| BE YouTube status + lease config/policy | **14/14 PASS** (clean BE tree sample) |
| BE lease + YouTube focused (restore) | **31/31 PASS** (pre-clean-run) |

**Playwright LIVE-014/018:** not executed (requires `STREAMING_B1_E2E=1` + live mock stack; avoids unnecessary 5439 activity). Spec present at `e2e/host-advanced-studio-disposable.spec.ts`.

## Lockfile

See `frontend` `finish-b-rc-lockfile-repair-2026-10-31.md`. Broken + valid copies under `docs/ops/evidence/rc-lockfile/`.

## Streaming fixes

See `finish-b-streaming-fixes-ancestry-2026-10-31.md` — PR **#139** integrated on B branch.

## Superadmin UI

See `finish-b-superadmin-rc-status-2026-10-31.md` — API present; editor UI **not delivered** in host frontend.

## Verdict

**RC engineering: PASS** — ready for PR review and owner Exp-05 approval (no push/deploy in this step).
