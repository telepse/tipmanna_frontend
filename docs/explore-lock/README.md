# Explore lock — working contract vs frozen benchmark

Mirrors `docs/tv-lock/README.md`.

## Working lock

| Surface | Path |
|---------|------|
| Product + LOCKED EXPLORE CONTRACT | `product-behaviors/explore-feed-product-behavior.md` |
| Golden rule | `.cursor/rules/explore-golden-lock.mdc` |
| Policy + contract tests | `src/lib/explore-reel-audio-policy.ts`, `src/lib/__tests__/explore-contract.spec.ts`, `explore-reel-audio-policy.spec.ts` |

Update only for a **named Explore bug**, with lock text + tests in the same change, and declared **platform scope** (iOS-only fixes must include a non-iOS unchanged test).

## Benchmark

Mint `docs/explore-lock/benchmarks/YYYY-MM-DD-audio/` only after user confirms the real-device matrix. Do not edit minted folders.
