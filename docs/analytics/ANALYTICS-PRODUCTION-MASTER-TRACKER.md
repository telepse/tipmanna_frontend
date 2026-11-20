# Tipmanna Analytics — Production master project tracker

**Programme:** Tipmanna Analytics production release (integrated FE/BE pair)  
**Status:** **`CLOSED — PRODUCTION VERIFIED`**  
**Last reconciled:** 2026-11-20

This is the **production** master tracker for Analytics release closure. It is **not** the Wave 3 tracker (`WAVE3-ANALYTICS-TRACKER` / Wave 3 master status).

## Authoritative closure record

[artifacts/analytics-production-release-closure-2026-11-19.md](./artifacts/analytics-production-release-closure-2026-11-19.md)

## Production pins (current)

| Layer | Value |
|-------|--------|
| Frontend source SHA | `7faf1af6976d4f1eb4c8267d5ef2a3958a93144c` |
| Frontend Vercel deployment | `dpl_9RLvNnZSqfZye6RkZP5Re3fbYMud` (`tipmanna-live-lv6o67fyo`) |
| Backend approved Analytics pin | `5eb29d6a48cf74dc33f68ee768e6bc0d881df5b6` |
| Backend live tipmanna-live SHA | `614267837b1c6dbfd93c75c6cb60c8ebba8bfcf1` (PR #156 Taye AC9 dist refresh; Analytics `src` unchanged vs approved pin) |

## Closure checklist

| Item | Status |
|------|--------|
| Production FE deploy + SDK v2 | **PASS** |
| Production Analytics ingest + persistence | **PASS** (event UID `b109c2ab-4a79-453a-9244-29acbd2d77dc`) |
| FE regression (TipLink payment/audio + analytics-sdk) | **48/48 PASS** |
| Production-critical Analytics defects | **NONE** |
| Closure documentation | **MERGED / updated** |

## Historical scope (unchanged)

| Programme | Disposition |
|-----------|-------------|
| Wave 3 TipLink | **`WAIVED — NOT VERIFIED`** |
| TipLink Product Test01 | **`CLOSED`** |
| Production `ANALYTICS_READ_*` cutover | **Outside this closure scope** |
