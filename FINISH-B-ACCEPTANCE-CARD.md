# Finish B — Walk B acceptance card (restore fixture ONLY)

**Provider:** mock · **Ingest:** off · **Not** real Daily media  
**Authoritative seed file (password stays local, never paste):**  
`frontend-wt-b1-finish-b-restore/.streaming-b1-e2e.json`

## Do not use

| Reject | Why |
| --- | --- |
| `frontend-wt-b1-finish-b/.streaming-b1-e2e.json` | Legacy host `b1e2e_cbdc5ed6` / event `67008c89-…` — **wrong owner** for restore studio URL → API **403** |
| Any profile/studio URL containing `b1e2e_cbdc5ed6` or `67008c89` | Wrong fixture |

## Use only these URLs

| Item | Value |
| --- | --- |
| Account (email / username) | `b1e2e_1c0d9c7c@example.test` / `b1e2e_1c0d9c7c` |
| Host id (DB) | `1c0d9c7c-6355-43e2-bf46-de1d114d2a05` |
| Sign-in | https://192.168.1.202:3443/sign-in |
| Creator profile | https://192.168.1.202:3443/@b1e2e_1c0d9c7c |
| Advanced Studio / broadcast | https://192.168.1.202:3443/host/b1e2e_1c0d9c7c/broadcast/be962849-e3c4-44f8-887f-9ae76a1d056d |
| Event id | `be962849-e3c4-44f8-887f-9ae76a1d056d` |
| Broadcast id | `9d0004b6-7e0a-48d8-bf92-0084b791cfda` |
| Starting state | Prep **`none`**, Rate **`standard`** (do not re-seed) |
| Password | only in the seed JSON above (`hostPassword`) |

## Walk B results (2026-10-30) — PASS

| Step | Result |
| --- | --- |
| Laptop: Set up Advanced → Claim director → Create invite | **PASS** |
| Phone: Redeem invite (same HTTPS origin) | **PASS** |
| Laptop: Activate → Split → Return to Standard | **PASS** (after director re-claim; disposable lease TTL extended to 15m) |
| Auth / profile / logout (Walk A) | **PASS** — retained |

**Note:** First activate hit `DIRECTOR_LEASE_REQUIRED` when default 120s lease expired during phone redeem; not an ownership failure. See evidence §E3.

## Outstanding phone security (not claimed)

| Check | Status |
| --- | --- |
| Phone cookie `Secure` flag inspection | **OUTSTANDING** |
| Phone direct `:8014` / `:5439` fail | **OUTSTANDING** (PC FW blocks still enabled) |

Six-archive preservation remains a **separate BLOCKED** programme item.
