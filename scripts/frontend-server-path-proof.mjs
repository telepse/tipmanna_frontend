/**
 * Runs backend reachability checks from the Next.js server process via the
 * dev-only /api/dev/backend-path-proof route. Requires frontend on localhost:3000.
 *
 * Usage:
 *   node scripts/frontend-server-path-proof.mjs
 *   node scripts/frontend-server-path-proof.mjs concurrent
 */

const FRONTEND = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function runMode(mode) {
  const url = `${FRONTEND.replace(/\/$/, "")}/api/dev/backend-path-proof?mode=${mode}&health=50&feed=20`;
  console.info(`[frontend-server-path-proof] GET ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    console.error("ROUTE_FAIL", res.status, await res.text());
    process.exit(1);
  }
  const body = await res.json();
  console.info(JSON.stringify(body, null, 2));

  const h = body.sequentialOrConcurrent?.health;
  const f = body.sequentialOrConcurrent?.feed;
  const boot = body.concurrentFeedBoot;
  const failures = [];
  if (h?.pass !== 50) failures.push(`health ${h?.pass}/50`);
  if (f?.pass !== 20) failures.push(`feed ${f?.pass}/20`);
  if (boot?.pass !== 20) failures.push(`concurrent boot ${boot?.pass}/20`);
  if (failures.length) {
    console.error("FRONTEND_SERVER_PATH_PROOF_FAIL", failures.join(", "));
    process.exit(1);
  }
  console.info("FRONTEND_SERVER_PATH_PROOF_OK", { mode });
}

const mode = process.argv[2] === "concurrent" ? "concurrent" : "sequential";
await runMode(mode);
if (mode === "sequential") {
  await runMode("concurrent");
}
