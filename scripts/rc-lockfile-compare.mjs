import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const validPath = path.join(root, "docs/ops/evidence/rc-lockfile/package-lock.json.VALID-dirty-preserved");
const brokenPath = path.join(root, "docs/ops/evidence/rc-lockfile/package-lock.json.at-9fa64a9.BROKEN");
const valid = JSON.parse(fs.readFileSync(validPath, "utf8"));

let brokenParse = "ok";
try {
  JSON.parse(fs.readFileSync(brokenPath, "utf8"));
} catch (e) {
  brokenParse = e.message.split("\n")[0];
}

function lockVersion(name) {
  const k = `node_modules/${name}`;
  return valid.packages?.[k]?.version ?? valid.dependencies?.[name]?.version ?? null;
}

const declared = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const mismatches = [];
for (const [name, range] of Object.entries(declared)) {
  const v = lockVersion(name);
  if (!v) mismatches.push({ name, range, lock: "MISSING" });
}

const keys = ["next", "react", "react-dom", "@daily-co/daily-js", "vitest", "typescript", "eslint", "playwright"];
const sample = Object.fromEntries(keys.map((k) => [k, { range: declared[k] ?? null, locked: lockVersion(k) }]));

console.log(JSON.stringify({ brokenParse, lockPackages: Object.keys(valid.packages ?? {}).length, sample, missingFromLock: mismatches.slice(0, 20), missingCount: mismatches.length }, null, 2));
