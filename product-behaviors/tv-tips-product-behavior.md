# TV tips — product behavior

Tips, tip catalog, and related SSR/layout for `/tv` are **isolated** from the locked playback engine.

## Isolation rule

Tip, catalog, SSR, drawer, and layout work must **not** edit:

`tv-provider.tsx`, `tv-looper.tsx`, `tv-player.tsx`, `tv-autoplay.ts`, `tv-player-resume.ts`, `use-tv-player-controls.ts`.

See `docs/tv-lock/README.md` and `.cursor/rules/tv-tips-contract.mdc`.

## Surfaces (code-backed)

- Tip UI on TV shell / interactive chrome (not the playback six).
- Payment overlay / tip-drawer pause uses TVProvider pause APIs — do not invent a second player.
- Catalog / SSR paths for TV tips stay outside playback orchestration.

Expand with catalog SSR details when tip-specific product text is re-authored from tip components.
