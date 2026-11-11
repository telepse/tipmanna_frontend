# Benchmark v2 — TV playback

**Restored 2026-11-10 after workspace file loss; sources: prior session notes + `tv-playback-contract.spec.ts` audit on `bb4e852`.**

| Field | Value |
|-------|--------|
| Date | 2026-10-06 |
| Concern | playback |
| Status | Frozen restore target (user confirmed TV production-ready) |
| Supersedes | `docs/tv-lock/benchmarks/2026-09-26-playback/` (if present; do not edit) |
| Working-lock sources | `product-behaviors/tv-system-product-behavior.md` (LOCKED PLAYBACK CONTRACT + checklist), `.cursor/rules/tv-golden-lock.mdc`, `.cursor/rules/tv-playback-contract.mdc`, `product-behaviors/payment-transaction-and-return-state.md` (Cases A–D / PPLA) |
| Contract tests | `src/lib/__tests__/tv-playback-contract.spec.ts` |
| Engine files (must stay matching) | `tv-provider.tsx`, `tv-looper.tsx`, `tv-player.tsx`, `tv-autoplay.ts`, `tv-player-resume.ts`, `use-tv-player-controls.ts` |

Do not edit this folder. If playback changes after a later named bug and confirmation, mint a new dated playback folder.
