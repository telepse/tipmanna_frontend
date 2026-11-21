# TV lock — working contract vs frozen benchmark

Tipmanna TV has two related artifacts. They are not the same thing.

## Working lock (live)

The working lock is what agents and engineers follow **today**.

| Surface | Path |
|---------|------|
| Playback product + contract | `product-behaviors/tv-system-product-behavior.md` |
| Playback golden rule | `.cursor/rules/tv-golden-lock.mdc` |
| Playback technical rules | `.cursor/rules/tv-playback-contract.mdc` |
| Playback contract tests | `src/lib/__tests__/tv-playback-contract.spec.ts` |
| Tips / catalog / SSR | `product-behaviors/tv-tips-product-behavior.md` |
| Tips technical rules | `.cursor/rules/tv-tips-contract.mdc` |

Update a working lock **only** when:

1. The user names a bug on that surface (playback vs tips), and
2. The code fix ships **with** the lock + tests in the same change, and
3. The user confirms that change is production-ready.

Tip, catalog, SSR, drawer, and layout work must not edit the playback six (`tv-provider`, `tv-looper`, `tv-player`, `tv-autoplay`, `tv-player-resume`, `use-tv-player-controls`).

## Benchmark (frozen restore target)

A benchmark is a **dated snapshot** of a working lock after a human says: this is production-ready. It is the restore target if a later change regresses TV.

| Rule | Meaning |
|------|---------|
| Never edit a minted folder | Fix the working lock, then mint a **new** dated folder |
| Mint only after confirmation | Implementation does not mint. Confirmation mints |
| One concern per folder | Playback and tips are separate snapshots |
| Proposed is not a lock | `docs/tv-lock/proposed/` is a named-bug note only |

### How to mint

1. User confirms the current working lock is production-ready.
2. Copy the confirmed lock text into a new folder:

```
docs/tv-lock/benchmarks/YYYY-MM-DD-<concern>/
  MANIFEST.md
  contract.md
```

3. `MANIFEST.md` records date, concern (`playback` or `tips`), source working-lock paths, and the confirmation note.
4. Leave older benchmark folders untouched.

### How to restore

1. Diff the working lock against the latest confirmed benchmark for that concern.
2. Restore **code** to match the benchmark contract (and its tests).
3. Do not “improve” playback while restoring tips, or the reverse.

## Proposed (named bug only)

`docs/tv-lock/proposed/` holds the write-up for a named bug **before** the working lock is updated, or as a change record while the code ships and confirmation is still pending.

Until the user confirms, proposed text is not the lock and is not a benchmark.
