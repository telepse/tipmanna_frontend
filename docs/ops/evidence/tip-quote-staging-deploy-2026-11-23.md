# Tip Quote LIVE — staging FE deploy evidence (2026-11-23)

## FE release candidate
- Branch: `release/tip-quote-live-checkout-fe-2026-11-23`
- SHA: `f1dd961a8a8ff01f64ade3474acc2689eaeb05e9`
- Base: `origin/main` @ `ff3efc3374e95becc2f52458a74e944fbe2ca0ab` (includes PRs #112–#116)
- PR: https://github.com/telepse/tipmanna_frontend/pull/129

## Staging FE deployment
- Vercel project: `tipmanna-testing`
- Deployment id: `dpl_9JxrtZRYw3MpHpoy8LDVe5uYjEv3`
- Ready URL: `https://tipmanna-testing-qk8iohtaz-telepse-companys-projects.vercel.app`
- Aliased production URL: `https://tipmanna-fj3ffgvfq-test01.vercel.app`
- Method: `vercel deploy --prod` from isolated RC worktree
- Note: CLI deploy did not inject `VERCEL_GIT_COMMIT_SHA` into `/api/deploy-info` (commit fields null). Authoritative RC SHA is git `f1dd961`.

## Staging BE
- Service: `tipmanna-staging` (`https://tipmanna-staging.onrender.com`) — `/health` OK
- Tip Quote enforcement already present on remote BE; FE RC is the functional fix
- Optional BE diag SHA `1aeabc242cad7da95c25db8d598174daccf6f3b6` (PR https://github.com/telepse/tipmanna_server/pull/162) — not required for checkout restore; Render Manual Deploy pending owner

## Automated checks
- Unit tests (identical sources in sibling WT): 10/10 tip-quote FE specs PASS
- Physical device / payment matrix: PENDING owner/QA execution on staging URL above

## Production (not deployed)
- LIVE FE still `ff3efc3` on `tipmanna-live` / `www.tipmanna.tv` (pre tip-quote)
- Production promotion blocked pending staging acceptance + owner approval
