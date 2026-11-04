# Frontend lockfile RC repair (2026-10-31)

## Preserved artifacts

| File | Role |
| --- | --- |
| `docs/ops/evidence/rc-lockfile/package-lock.json.at-9fa64a9.BROKEN` | Exact bytes from git `9fa64a9` — **invalid JSON** (UTF-16/null prefix; npm: unexpected non-whitespace at line 2) |
| `docs/ops/evidence/rc-lockfile/package-lock.json.VALID-dirty-preserved` | Working-tree copy used for Phase 0 / RC installs — **valid** lockfileVersion 3 |

## Validation against `package.json`

Script: `scripts/rc-lockfile-compare.mjs` (2026-10-31)

- All declared `dependencies` + `devDependencies` resolve in the valid lock (**missingCount: 0**).
- Sample pinned versions match declared ranges (e.g. `next@15.5.7`, `react@19.1.0`, `@daily-co/daily-js@0.83.1`).

## Significant dependency changes (valid vs broken committed tree)

The broken blob at `9fa64a9` is **not a diffable lock** — it cannot be parsed. The RC commit replaces it with the **preserved valid lock** produced from a coherent `npm` install against the same `package.json` at that pin.

Observed differences vs an unparseable committed file are therefore:

1. **Structural repair** — restore valid JSON / lockfileVersion 3 envelope (required for `npm ci`).
2. **Transitive tree refresh** — normal semver resolution within existing `package.json` ranges (e.g. `vitest` caret → 3.2.7, `playwright` → 1.64.1, `typescript` → 5.9.3). **No intentional `package.json` range changes** in this RC commit.

**Not included:** unrelated install churn from other worktrees or blind `npm update`.
