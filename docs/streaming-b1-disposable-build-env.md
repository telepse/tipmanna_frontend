# Finish B — disposable Playwright / production build environment

**Scope:** Local disposable stack only (`127.0.0.1:5439` PG, `127.0.0.1:8000` API, `127.0.0.1:3000` frontend).  
**Not for staging or production deploys.**

## Frontend production build (required for Playwright `npm run start`)

Set before `npm run build`:

| Variable | Example (disposable only) |
| --- | --- |
| `NEXT_PUBLIC_BACKEND_API_URL` | `http://127.0.0.1:8000/api/v1` |

Without this URL, static generation for routes such as `/partner` fails (plan-pricing fetch against `undefined`).

Service worker verification runs as part of the production build; keep the same API URL for build and runtime.

## Playwright Advanced Studio journey

| Variable | Purpose |
| --- | --- |
| `STREAMING_B1_E2E=1` | Enables `setup-streaming-b1` + `streaming-b1-chromium` projects |
| `PLAYWRIGHT_BACKEND_URL` | API root without `/api/v1` (e.g. `http://127.0.0.1:8000`) |
| `PLAYWRIGHT_BASE_URL` | Frontend under test (default `http://127.0.0.1:3000`) |
| `STREAMING_B1_E2E_EVENT_ID` / `STREAMING_B1_E2E_HOST_SLUG` | Optional; loaded from `.streaming-b1-e2e.json` when omitted |

Seed (backend, disposable DB):

```bash
npm run streaming:db:up
npm run streaming:db:migrate
npm run streaming:b1:e2e-seed
```

Backend runtime (same machine):

- `DATABASE_URL` → disposable 5439
- `NATIVE_STREAMING_ADVANCED_STUDIO_ENABLED=true`
- `JWT_SECRET` must match tokens minted by the seed script

Run Playwright:

```bash
STREAMING_B1_E2E=1 PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8000 npx playwright test --project=streaming-b1-chromium
```
