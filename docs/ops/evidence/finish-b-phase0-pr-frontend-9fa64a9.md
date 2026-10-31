# Finish B Phase 0 — Frontend PR description (do not push in this step)

**Source revision (full):** `9fa64a9ce218b2e7d6f1f925da6f456a15541d70`  
**Branch:** `feature/pr-live-b1-finish-b`  
**Worktree:** `frontend-wt-b1-finish-b-restore`  
**Base pin retained:** `0933c70` + this commit ahead of `origin/feature/pr-live-b1-finish-b`

## Summary

- Trusted-LAN HTTPS recovery for Host Advanced Studio: `/@` creator rewrite prefers forwarded host/proto; ownership-denied UX for wrong fixture.
- Restore-fixture acceptance card + regression tests for rewrite, Caddy forwarded-host, authz messaging, and Host sign-in schema password message.
- Phase 0 host sign-in verify helper under `e2e/`.

## Included files (`git show --name-status 9fa64a9`)

| Status | Path |
| --- | --- |
| A | `FINISH-B-ACCEPTANCE-CARD.md` |
| A | `e2e/phase0-host-sign-in-verify.mjs` |
| M | `src/components/host/host-event-broadcast-client.tsx` |
| A | `src/lib/__tests__/creator-at-rewrite.spec.ts` |
| A | `src/lib/__tests__/event-broadcast-authz-message.spec.ts` |
| A | `src/lib/__tests__/finish-b-caddy-forwarded-host.spec.ts` |
| A | `src/lib/creator-at-rewrite.ts` |
| A | `src/lib/event-broadcast-authz-message.ts` |
| M | `src/middleware.ts` |
| A | `src/schemas/__tests__/host.schema.spec.ts` |
| M | `src/schemas/host.schema.ts` |

## Explicitly not in this commit (preserved dirty / outside)

- `package-lock.json` — dirty; SHA256 preserved in Phase 0 closeout checkpoint (not discarded).
- `.finish-b-https-origin.txt` — untracked local origin pointer.
- `%USERPROFILE%\finish-b-lan-tools\Caddyfile` — LAN TLS terminator (outside repo).
- Runtime seed `.streaming-b1-e2e.json` — gitignored credentials.

## Test plan

- [x] Vitest: creator-at-rewrite, event-broadcast-authz-message, finish-b-caddy-forwarded-host (7 passed at closeout).
- [x] Manual trusted-LAN Walk A+B on restore fixture `b1e2e_1c0d9c7c` (retained PASS).
- [ ] Reviewer: confirm no secrets in diff; Caddyfile change reviewed outside git.

## Phase 0 close

Trusted-LAN mock Phase 0 is **CLOSED** with backend evidence `finish-b-phase0-CLOSED-2026-10-30.md`. Walk A/B PASS retained.

## Out of scope

No push/merge/deploy in this packaging step. Mock provider only. Finish A untouched.
