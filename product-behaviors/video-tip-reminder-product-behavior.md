# Video tip reminder — product behavior

## Surfaces

| Surface                       | Flash (5s overlay) | In-app (once per session) |
| ----------------------------- | ------------------ | ------------------------- |
| Event room                    | Yes                | Yes                       |
| Channel client                | Yes                | Yes                       |
| Content client                | Yes                | Yes                       |
| TipLink `/l/{slug}`           | Yes                | Yes                       |
| Explore feed                  | No                 | Yes                       |
| TV / home TV / web TV loopers | No                 | Yes                       |
| TV partner preview            | No                 | No                        |

## Playback

- Cues fire when playback reaches each configured minute offset.
- Flash overlay auto-dismisses after 5 seconds; playback is not paused.
- Session key: `video-tip-reminder:{channelId}:{offsetSec}` — no repeat flash or in-app in the same browser session.
- **Tip Now** opens the tip drawer (bypassing character-strip selection via `openTipDrawerNonce`).
- **Dismiss** closes the overlay; in-app notification stays unread until acted on.

## Authoring

- Free hosts: 1 reminder slot.
- Growth/Community (active premium): 2 slots.
- Third slot is reserved in UI (disabled + premium indicator).
- Backend enforces slot limits on create and manage-event PATCH.

## In-app notification

- Kind: `video_tip_reminder`
- Copy: `{host first name} requests support while watching {video title}`
- Deduped per channel offset and recipient.
