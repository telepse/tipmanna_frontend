# Finish B — finite completion list (2026-10-31)

**RC pins:** FE `ab374ff…` · BE `b4a52bf…` · Superadmin `05f6a90…`  
**Phase 0:** CLOSED · **No push/merge/deploy/paid test/Finish A changes** in this closeout.

---

## Remaining code

| #   | Item                                            | Status                                                                                                                                                       |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Host FE + BE feature work for LIVE-011–018 core | **Done** on branch (incl. PR #139 on BE, lockfile on FE)                                                                                                     |
| 2   | Superadmin LIVE-016 editor                      | **Done** @ `ccde5a7` on superadmin branch; **not** in host FE tree                                                                                           |
| 3   | B production worker dist verify                 | **Done** — `verify:streaming-lifecycle-worker-dist` on branch                               |
| 4   | Finish A / PR #142                              | **Out of scope** — do not modify                                                                                                                             |

---

## Remaining PRs

| #   | Repo                  | Action                                                                                               |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | `tipmanna_frontend`   | Merge FE PR @ `ab374ff` (lockfile + evidence)                                                        |
| 2   | `tipmanna_server`     | Merge BE PR @ `b4a52bf` (PR #139 cherry-picks + lease tests + docs)                                  |
| 3   | `tipmanna_superadmin` | **New PR** from `feature/pr-live-b1-finish-b` @ **`05f6a90`** — LIVE-016 branding editor + dev merge |

---

## Remaining automated checks

| #   | Check                                                                         | Status                                          |
| --- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | Clean `npm ci` / typecheck / build @ `54fd8fe`/`2f2e64c`                      | **PASS** (retained; RC doc-only delta verified) |
| 2   | Targeted mock unit journey (composition, RTMP contract, lease, studio client) | **PASS** — see worker + real-provider card      |
| 3   | HTTP integration @ **5441** (advanced + branding)                             | **PASS** — `finish-b-automated-gates-2026-10-31.md` |
| 4   | Playwright `STREAMING_B1_E2E=1` (5441 / 8015 / 3016)                        | **Pending retry** — see gates doc                   |
| 5   | Superadmin `bun run build` @ `05f6a90`                                      | **PASS** (local gate)                               |

---

## Real-provider acceptance

| #   | Item                                                              | Status                                                                                   |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | R2-10 minimal window (Daily programme + optional YouTube RTMP)    | **Pending owner approval** — card `finish-b-real-provider-acceptance-card-2026-10-31.md` |
| 2   | LIVE-016 superadmin → host preview → (optional) programme overlay | **Pending** UI walk @ superadmin `05f6a90`                                               |
| 3   | Provider usage + external cleanup evidence                        | **Pending** real window                                                                  |

---

## Owner product decisions

| #   | Decision                                                     |
| --- | ------------------------------------------------------------ |
| 1   | Approve Exp-05 budget/duration (NEW PROPOSAL caps in card)   |
| 2   | Choose RTMP destination (YouTube test vs tap only) for R2-10 |
| 3   | LIVE-017 native ingest alerts on/off for B1                  |
| 4   | Whether to add B worker dist verify before production deploy |
| 5   | Sign-off LIVE-011–018 matrix vs R2-10-only ship              |

---

## Release work

| #   | Task                                                                                           |
| --- | ---------------------------------------------------------------------------------------------- |
| 1   | Merge three PRs (FE, BE, superadmin) after review                                              |
| 2   | Deploy API + worker with documented launcher (`streaming:lifecycle-worker` or verified `dist`) |
| 3   | Deploy superadmin with `VITE_API_ENDPOINT` matching API                                        |
| 4   | Post-merge: optional isolated integration + Playwright before prod flag                        |
| 5   | Release notes referencing Phase 0 closeout + RC validation doc                                 |

---

## Docs-only attribution (RC SHAs vs build pins)

| Repo | Range                 | Files changed                                                                                                                                     |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| FE   | `54fd8fe` → `ab374ff` | `docs/ops/evidence/*.md` only                                                                                                                     |
| BE   | `2f2e64c` → `b4a52bf` | `docs/ops/evidence/finish-b-rc-pr-package-2026-10-31.md`, `finish-b-rc-validation-2026-10-31.md` (+ subsequent evidence updates in this closeout) |

**Executable code, lockfile (at `54fd8fe`), dependencies, and build configs unchanged** between build pins and RC SHAs — existing build evidence stands.
