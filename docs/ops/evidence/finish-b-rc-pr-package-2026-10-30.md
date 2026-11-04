# Finish B RC — reviewable PR package (do not push yet)

## PR 1 — Frontend (`feature/pr-live-b1-finish-b`)

**Base content SHA:** `9fa64a9ce218b2e7d6f1f925da6f456a15541d70`  
**RC follow-up commit(s):** lockfile hygiene + closeout docs (local)

**Title:** `fix(finish-b): trusted-LAN HTTPS recovery + RC lockfile hygiene`

**Includes (already in 9fa64a9):**

- `/@` creator rewrite, middleware, authz messaging, acceptance card, vitest, phase0 verify script.

**RC add:**

- `package-lock.json` — replace corrupt committed lock with preserved valid lockfile.
- `docs/ops/evidence/*` — Phase 0 CLOSED, RC validation, PR blurbs (no secrets).
- `FINISH-B-ACCEPTANCE-CARD.md` — Phase 0 CLOSED / lease note (if not already in 9fa64a9).

**Test plan:**

- [ ] `npm ci` clean checkout
- [ ] `npm run typecheck`
- [ ] `npm run test` (creator-at-rewrite, authz, caddy-host, host.schema)
- [ ] `npm run build` with acceptance env vars

**Not in PR:** `.streaming-b1-e2e.json`, `.finish-b-https-origin.txt`, Caddyfile.

---

## PR 2 — Backend (`feature/pr-live-b1-finish-b`)

**Base content SHA:** `9014c88c84b4cdfcf9f159c5029c186d062a1e84`  
**RC follow-up commit(s):** director lease tests + evidence (local)

**Title:** `test(finish-b): 120s director lease RC + Phase 0 evidence`

**Includes (already in 9014c88):**

- Activate `DIRECTOR_LEASE_REQUIRED` hint, seed bcrypt, env.example TTL note, trusted-LAN evidence.

**RC add:**

- Lease/config/service vitest coverage for **120s** default (expiry + reclaim).
- Phase 0 / RC / real-provider acceptance markdown.

**Test plan:**

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm run test` — advanced lease + session policy suites
- [ ] `npm run build`

**Migrations:** none new; reviewers run `prisma migrate deploy` only on disposable DB.

**Not in PR:** `.env.streaming.b1-e2e`, worker logs, seed passwords.

---

## PR 3 — Superadmin

**Not required** for this RC slice. LIVE-016 superadmin **API** (`streaming-superadmin.controller.ts` branding routes) ships in **backend PR 2** branch already. Dedicated superadmin **UI** walk remains post–real-provider proof — no separate repo change in restore worktrees.

---

## Expected final SHAs (after local RC commits, before push)

Record at push time:

```
FE=<after lockfile + docs commit>
BE=<after lease tests + docs commit>
```

Preserve Phase 0 pins in git notes / evidence even after RC commits.

## Push order (owner later)

1. Backend PR (API contract + tests)
2. Frontend PR (depends on API for full E2E)
3. Real-provider acceptance only after both merged to acceptance branch **and** owner approves Exp-05 window
