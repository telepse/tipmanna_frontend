# TipLink — deployment env requirements (Release approval)

Apply on the deployment targeted for staging acceptance (not Wave 3 Test01 pin unless explicitly promoted).

| Variable | Required value | Evaluated at |
|----------|----------------|--------------|
| `NEXT_PUBLIC_ANALYTICS_SDK_V2` | `true` | **Build** (Next.js compile) |
| `NEXT_PUBLIC_ANALYTICS_SURFACE_TIPLINK_V2` | `true` | **Build** |

Without both, TipLink routes use legacy `tvAnalytics` fallback via `tiplink-analytics.ts` (session still bootstrapped).

**No Vercel or shared env changes authorized in engineering execution** — this document is for Release/TAYE sign-off only.
