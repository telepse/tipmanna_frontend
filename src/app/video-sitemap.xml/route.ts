import { NextResponse } from "next/server";

import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { getYoutubeThumbnail } from "@/lib/extractYoutubeID";
import { buildContentShareUrl } from "@/lib/public-video-url";

type VideoRow = Record<string, unknown>;

function unwrapListPayload(raw: unknown): VideoRow[] {
  if (Array.isArray(raw)) return raw as VideoRow[];
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: VideoRow[] }).data;
  }
  return [];
}

async function fetchLatestVideos(): Promise<VideoRow[]> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) return [];
  try {
    const res = await fetch(`${base}/contents/latest?limit=100`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return unwrapListPayload(await res.json());
  } catch {
    return [];
  }
}

async function fetchLiveStreamVideos(): Promise<VideoRow[]> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) return [];
  try {
    const res = await fetch(`${base}/contents/live-streams`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as {
      upcoming?: VideoRow[];
      live?: VideoRow[];
      recentlyEnded?: VideoRow[];
    };
    return [
      ...(Array.isArray(raw.live) ? raw.live : []),
      ...(Array.isArray(raw.upcoming) ? raw.upcoming : []),
      ...(Array.isArray(raw.recentlyEnded) ? raw.recentlyEnded : []),
    ];
  } catch {
    return [];
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildVideoSitemapEntry(params: {
  pageUrl: string;
  title: string;
  playerUrl?: string;
  thumbFallback: string;
}): string {
  const thumb = params.playerUrl
    ? (getYoutubeThumbnail(params.playerUrl) ?? params.thumbFallback)
    : params.thumbFallback;
  return `
  <url>
    <loc>${escapeXml(params.pageUrl)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumb)}</video:thumbnail_loc>
      <video:title>${escapeXml(params.title)}</video:title>
      <video:description>${escapeXml(params.title)}</video:description>
      ${params.playerUrl ? `<video:player_loc>${escapeXml(params.playerUrl)}</video:player_loc>` : ""}
      <video:publication_date>${new Date().toISOString()}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
    </video:video>
  </url>`;
}

export async function GET() {
  const [latestRows, liveRows] = await Promise.all([
    fetchLatestVideos(),
    fetchLiveStreamVideos(),
  ]);
  const origin = getPublicAbsoluteUrl("").replace(/\/$/, "");
  const thumbFallback = `${origin}/icons/icon-512.png`;
  const seen = new Set<string>();
  const entries: string[] = [];

  const pushEntry = (pageUrl: string, row: VideoRow) => {
    if (!pageUrl || seen.has(pageUrl)) return;
    seen.add(pageUrl);
    const title = typeof row.title === "string" ? row.title : "Tipmanna video";
    const playerUrl = typeof row.url === "string" ? row.url : undefined;
    entries.push(
      buildVideoSitemapEntry({
        pageUrl,
        title,
        playerUrl,
        thumbFallback,
      })
    );
  };

  for (const row of latestRows) {
    const id = typeof row.id === "string" ? row.id : "";
    const event = row.event as { id?: string } | undefined;
    const eventId = event?.id ?? "";
    if (!id || !eventId) continue;
    pushEntry(buildContentShareUrl({ eventId, channelId: id }), row);
  }

  for (const row of liveRows) {
    const event = row.event as { id?: string } | undefined;
    const eventId = event?.id ?? "";
    if (!eventId) continue;
    pushEntry(`${origin}/channel/${eventId}`, row);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries.join("")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
