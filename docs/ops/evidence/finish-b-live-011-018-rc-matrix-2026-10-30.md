# LIVE-011–018 — RC matrix (implementation vs proof)

Post–Phase 0; candidate SHAs `9fa64a9` / `9014c88`.

| ID | Implementation in candidate | Missing implementation | Missing proof / owner |
| --- | --- | --- | --- |
| **011** | Advanced Studio routes, director lease policy, prep/activate/downgrade, flag gate | Programme-wide flag rollout policy (default off) | Owner milestone; not re-proving mock LAN |
| **012** | Invite redeem API + FE panel | Production-shaped contributor UX polish | Real Daily second device (not mock) |
| **013** | Mock compositor + real adapter code paths | None for code path | **Exp-05** visible real composition output |
| **014** | HTTP integration spec + Playwright disposable spec | — | Owner sign-off; CF tunnel still blocked |
| **015** | Assisted preset framework + UI hooks | — | Product walk / owner acceptance |
| **016** | Branding render config + host preview; superadmin API | Dedicated superadmin UI in separate app not in restore WT | Superadmin edit walk; real outbound overlay |
| **017** | Ingest services + integration spec (flag off) | — | Owner decision to enable ingest + tip→alert proof |
| **018** | Playwright spec in tree | CI job wiring on release branch | `STREAMING_B1_E2E=1` run on RC SHAs |

**RC engineering completed:** 120s lease automated tests; lockfile hygiene identified; no new product policy.

**Not in scope:** Paid provider, deploy, Finish A, Phase 0 repeats.
