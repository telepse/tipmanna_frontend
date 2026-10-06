# Venue and public Wi‑Fi — YouTube allowlist for Tipmanna TV & Explore

Operational guide for network administrators, venue IT, and Tipmanna support when **Tipmanna loads but video does not play** on guest or enterprise Wi‑Fi.

Tipmanna **does not proxy YouTube video** through its own servers. Allowlisting only Tipmanna domains is **not sufficient** for TV or Explore playback.

---

## What must work (HTTPS / TCP 443)

### Tipmanna application (required for the product shell)

Users must reach the deployed Tipmanna web application and its API over **HTTPS (443)**.

Typical production origins (confirm against your deployment):

| Purpose               | Hostnames (examples)                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Primary app           | `tipmanna.tv`, `www.tipmanna.tv`                                                                                         |
| Discovery / marketing | `tipmanna.com`, `www.tipmanna.com`                                                                                       |
| Backend API           | Host configured in `NEXT_PUBLIC_BACKEND_API_URL` for that environment (same allowlist as your production API deployment) |

Also allow whatever CDN or hosting fronts the Next.js app (e.g. Cloudflare) **only as needed** for those Tipmanna hostnames. Blocking Tipmanna while allowing YouTube still yields a broken schedule/tips experience; allowing Tipmanna while blocking YouTube yields **blank or stuck video** (see below).

### YouTube — required for TV and Explore video

These are used by the Tipmanna frontend today (see `src/lib/youtube-iframe-api-loader.ts`, `src/lib/youtubePlayerConfig.ts`, `src/app/layout.tsx`, Explore posters):

| Category                    | Host / pattern                                  | Role                                                 |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| IFrame API script           | `www.youtube.com` (path includes `iframe_api`)  | Loads the shared YouTube IFrame API singleton        |
| Privacy-enhanced embed host | `www.youtube-nocookie.com`                      | TV and Explore embed `host` for `YT.Player`          |
| Thumbnails / posters        | `i.ytimg.com`, `img.youtube.com`, `s.ytimg.com` | Posters, metadata, Explore off-stage previews        |
| Media delivery              | `*.googlevideo.com` (and `googlevideo.com`)     | Actual video stream segments after the player starts |

**Protocol:** HTTPS on port **443** for all of the above. Blocking or deep-inspecting YouTube traffic often breaks embeds even when Tipmanna HTML loads.

### Filtering categories

Many venue firewalls block **Streaming media** or **YouTube** as a category. Tipmanna TV and Explore depend on the same YouTube paths as a normal YouTube embed in a browser. **Allow YouTube / streaming** (or explicitly allow the hostnames above) on guest networks intended for Tipmanna TV.

---

## Why Tipmanna-only allowlisting is insufficient

Four separate layers must succeed:

1. **Tipmanna page and API** — HTML, schedule, tips, auth, WebSockets (e.g. Pusher) as configured for your deployment.
2. **YouTube IFrame API** — Script from `https://www.youtube.com/iframe_api` must load and call `onYouTubeIframeAPIReady`.
3. **YouTube embed host** — Player iframes use `https://www.youtube-nocookie.com` (Tipmanna’s configured embed host).
4. **YouTube media CDN** — Browser requests to `*.googlevideo.com` deliver the video stream.

Failure at layer 1: user may not reach Tipmanna at all.  
Failure at layer 2: TV may show **“Video service unavailable on this network”** (iframe API probe failed).  
Failure at layer 3 or 4: page and schedule may load, but the player stays blank or never reaches PLAYING; TV may show **“Video is taking longer than expected…”** after a bounded wait.

Tipmanna cannot fix layer 2–4 by allowlisting Tipmanna domains alone.

---

## Captive portals and guest Wi‑Fi

- Users must complete **captive portal sign-in** before any HTTPS probes or video requests succeed.
- After portal login, retest **both** Tipmanna and a direct check that `https://www.youtube.com/iframe_api` is reachable from a browser on the same network (or use Tipmanna TV **Retry** on the network notice).
- Some portals block non-HTTP traffic or throttle UDP; Tipmanna video uses **HTTPS** to Google, not Tipmanna-hosted media.

---

## Enterprise / security filtering

- **TLS interception (SSL bump)** on YouTube or googlevideo domains often breaks embeds or causes intermittent stalls. Prefer bypass or allowlist for the YouTube hostnames above.
- **DNS filtering** that returns NXDOMAIN or sinkholes for `googlevideo.com` or `youtube.com` produces the same symptoms as a firewall block.
- **Bandwidth limits** on guest VLANs can cause long buffering; that is not the same as a hard block but may delay PLAYING.

---

## Recommended troubleshooting sequence

1. On the **same device and Wi‑Fi**, open Tipmanna `/tv` or `/explore`. Confirm the shell loads (schedule, navigation).
2. If TV shows **video service unavailable**, test reachability of the YouTube IFrame API (network block at layer 2). Use **Retry** once the network is fixed.
3. If the shell loads but video never starts, test embed and media (layers 3–4). Check firewall logs for denied `googlevideo.com` or `youtube-nocookie.com`.
4. Confirm **captive portal** is complete and guest policy allows **streaming / YouTube**.
5. Apply allowlist changes, wait for policy propagation, **hard-reload** Tipmanna (`Retry` on TV notices or full page reload).
6. Retest **Live TV**, **Explore swipe**, and **sound on** via explicit user control (mute button / tap), not automatic unmute on load.

---

## Retest after allowlisting

| Check                                              | Expected                    |
| -------------------------------------------------- | --------------------------- |
| `/tv` loads, schedule visible                      | Tipmanna + API OK           |
| Video plays within normal startup time             | Embed + media OK            |
| No persistent “Video service unavailable”          | IFrame API OK               |
| No persistent “taking longer than expected”        | Player reaches PLAYING      |
| Explore: reel plays; sound only after user unmutes | Product behavior (Stage 2+) |

---

## Template for venue / IT (copy and send)

**Subject:** Guest Wi‑Fi allowlist for Tipmanna TV (YouTube embed required)

Our venue uses **Tipmanna** for live TV and short-form video. The app loads from Tipmanna’s website, but **video is served by YouTube**, not hosted on Tipmanna servers.

Please allow **outbound HTTPS (TCP 443)** from the guest network to:

**Tipmanna (confirm our production URLs with Tipmanna support if needed):**

- `tipmanna.tv`, `www.tipmanna.tv`
- `tipmanna.com`, `www.tipmanna.com`
- Our production API host (as provided in deployment docs)

**YouTube (required for playback):**

- `www.youtube.com` (including `/iframe_api`)
- `www.youtube-nocookie.com`
- `i.ytimg.com`, `img.youtube.com`, `s.ytimg.com`
- `*.googlevideo.com`

Please ensure **guest captive portal** users can reach these after login, and that **YouTube / streaming** categories are not blocked on the VLAN used for Tipmanna displays.

Allowlisting Tipmanna alone does **not** replace allowing YouTube; we do not proxy video through Tipmanna.

After changes, we will reload Tipmanna TV and verify playback.

---

## Related product behavior

See `product-behaviors/restricted-networks-and-youtube.md` for user-facing notices and Explore audio behavior.

## Related code (for engineers)

- IFrame API loader: `src/lib/youtube-iframe-api-loader.ts`
- TV reachability probe: `src/lib/tv-youtube-reachability.ts`
- Embed host constant: `YOUTUBE_NO_COOKIE_HOST` in `src/lib/youtubePlayerConfig.ts`
- TV user notices: `src/components/tv/tv-player-network-notices.tsx`
