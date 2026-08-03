#!/usr/bin/env node
/** Safe staging Explore deploy probe — no secrets. */
const base =
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://tipmanna-fj3ffgvfq-test01.vercel.app";
const origin = base.replace(/\/$/, "");

const deployInfo = await fetch(`${origin}/api/deploy-info`)
  .then(r => (r.ok ? r.json() : null))
  .catch(() => null);

const html = await fetch(`${origin}/explore?e2e=1`).then(r => r.text());
const fixtures = html.match(/data-explore-e2e-fixtures="([^"]+)"/)?.[1] ?? null;
const buildFlag =
  html.match(/data-explore-e2e-fixtures-build="([^"]+)"/)?.[1] ?? null;
const commit = html.match(/data-explore-deploy-commit="([^"]+)"/)?.[1] ?? null;

console.info(
  JSON.stringify({
    host: new URL(origin).hostname,
    deployInfo,
    runtimeFixtures: fixtures,
    buildFixturesFlag: buildFlag,
    deployCommit: commit ?? deployInfo?.commitShort ?? null,
    exploreE2eFixturesBuild: deployInfo?.exploreE2eFixturesBuild ?? null,
  })
);
