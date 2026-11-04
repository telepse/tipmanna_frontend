# Real-provider acceptance card — Exp-05 / R2-10 (Finish B disposable)

**Scope:** Proves **R2-10 / LIVE-013 real Daily composition capability** on an isolated stack.  
**Does not** alone prove full **B1 LIVE-011–018** journey (012 production UX, 014 owner sign-off, 016 superadmin walk, 017 ingest-on, 018 CI Playwright).

## Compatible revisions

| Component | SHA / pin |
| --- | --- |
| Frontend | `9fa64a9ce218b2e7d6f1f925da6f456a15541d70` + RC hygiene (valid `package-lock.json`) |
| Backend | `9014c88c84b4cdfcf9f159c5029c186d062a1e84` + RC lease-test commit |
| Branch | `feature/pr-live-b1-finish-b` |

YouTube optional path: B branch already includes Finish A–class parser/lifecycle fixes (`06cdc03`, `fc19be8`, `b7113c5` on `youtube-broadcast.*` / confirm-live). **Do not** change Finish A’s running candidate.

## Isolated environment (mandatory)

| Resource | Value |
| --- | --- |
| Postgres | Fresh disposable `127.0.0.1:5439` / `streaming_test` (docker-compose.streaming-test.yml) |
| API | `8014` (separate from Finish A) |
| Frontend | `3014` or tunnel — **not** Finish A staging hostname |
| Worker | Same `.env.streaming.b1-e2e` class as API |
| Provider | `STREAMING_PROVIDER_MODE=real` on **API + worker** |
| Advanced flag | `NATIVE_STREAMING_ADVANCED_STUDIO_ENABLED=true` for window only |
| Ingest | **Off** unless separately executing LIVE-017 |
| Director lease | **Default 120s** (`STREAMING_DIRECTOR_LEASE_TTL_MS` unset) — not Phase 0’s 15m override |
| Daily | **Dedicated** room name prefix; owner vault credentials |
| YouTube (optional) | Staging-linked test channel RTMP only if owner pre-authorised |

## Journey (director + real contributor)

1. Seed disposable host/event/broadcast (`streaming:b1:e2e-seed` pattern).
2. Host: sign-in → Advanced Studio → **Claim director** → **Create invite**.
3. Second device/browser: redeem invite → **real Daily** preview/join (not mock token).
4. Director: **Activate** (standard → advanced 2×) → **Programme patch** (e.g. split) → capture **visible compositor/output** evidence (RTMP frame, Daily composition status, or YouTube test ingest if used).
5. Director: **Return to standard** → confirm rate downgrade in API/DB.
6. **Stop** broadcast + lifecycle worker drain → Daily room delete / YouTube teardown per runbook.

## Billing / rate checks

| Step | Expected |
| --- | --- |
| Before activate | `consumptionRate=standard` |
| After activate | `consumptionRate=advanced` (2× policy) |
| After downgrade | `consumptionRate=standard` |

## Stop / cleanup (required)

- Revoke contributor sessions; clear director lease row.
- Stop lifecycle worker; confirm no stuck `StreamingProviderJob`.
- Delete Daily room; rotate/disable experiment API keys if policy requires.
- Truncate **5439 disposable PG only** — never Finish A DB.

## Duration and budget

| Item | Guideline |
| --- | --- |
| Wall clock | **≤ 90 minutes** setup + one full pass |
| Paid Daily | **≤ 30 minutes** live composition window (owner cap) |
| Operators | 1 engineer + 1 owner observer |
| Retry budget | **1** repeat after failure (new room + fresh seed) |

## Exit criteria

- Real contributor join observed on second device.
- Programme change produces **non-mock** compositor/provider job success.
- Visible output proof captured (file path in evidence, no secrets).
- Rate transitions verified in DB.
- Clean teardown checklist signed.

## Next owner action

**Approve** Exp-05 window, inject Daily (+ optional YouTube test) secrets into disposable env, and assign a **second physical device** for real join — engineering will not start paid provider until that approval.
