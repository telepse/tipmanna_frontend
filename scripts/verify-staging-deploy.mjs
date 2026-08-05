#!/usr/bin/env node
const base =
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://tipmanna-fj3ffgvfq-test01.vercel.app";

function pick(html, name) {
  const m = html.match(new RegExp(`${name}="([^"]+)"`));
  return m?.[1] ?? null;
}

async function attrs(path) {
  const html = await fetch(`${base}${path}`).then(r => r.text());
  return {
    path,
    fixtures: pick(html, "data-explore-e2e-fixtures"),
    build: pick(html, "data-explore-e2e-fixtures-build"),
    commit: pick(html, "data-explore-deploy-commit"),
  };
}

const deployInfo = await fetch(`${base}/api/deploy-info`)
  .then(r => (r.ok ? r.json() : null))
  .catch(() => null);

console.info(
  JSON.stringify(
    {
      base,
      deployInfo,
      plain: await attrs("/explore"),
      e2e: await attrs("/explore?e2e=1"),
    },
    null,
    2
  )
);
