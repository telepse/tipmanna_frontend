import Link from "next/link";

import { loadDiscoverCatalogServerWithTimeout } from "@/lib/discover-catalog-server";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { buildContentShareUrl } from "@/lib/public-video-url";
import { DISCOVER_RAIL_SUBTITLES } from "@/lib/event-type-options";

type ContentRow = {
  id: string;
  title: string;
  event?: { id?: string };
  url?: string;
};

type LiveStreamRow = {
  id: string;
  title: string;
  eventId?: string;
  event?: { id?: string };
};

type TipperRow = {
  id: string;
  username?: string;
};

type CommunityRow = {
  id: string;
  name: string;
};

function contentHref(row: ContentRow): string | null {
  const eventId = row.event?.id?.trim();
  if (!eventId || !row.id) return null;
  return buildContentShareUrl({ eventId, channelId: row.id });
}

function liveStreamHref(row: LiveStreamRow): string | null {
  const eventId = row.eventId?.trim() ?? row.event?.id?.trim();
  if (!eventId) return null;
  return `/channel/${eventId}`;
}

function SeoRail({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: ContentRow[];
}) {
  const links = items
    .map(row => {
      const href = contentHref(row);
      return href ? { href, title: row.title } : null;
    })
    .filter((x): x is { href: string; title: string } => Boolean(x))
    .slice(0, 12);

  if (!links.length) return null;

  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <ul>
        {links.map(link => (
          <li key={link.href}>
            <Link href={link.href}>{link.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function ExploreDiscoverSeoShell() {
  const catalog = await loadDiscoverCatalogServerWithTimeout();
  if (!catalog) return null;
  const liveStreamItems = [
    ...(catalog.liveStreams.live as LiveStreamRow[]),
    ...(catalog.liveStreams.upcoming as LiveStreamRow[]),
    ...(catalog.liveStreams.recentlyEnded as LiveStreamRow[]),
  ];

  return (
    <div className="sr-only">
      <SeoRail
        title="Top contents"
        subtitle={DISCOVER_RAIL_SUBTITLES.top}
        items={catalog.contents as ContentRow[]}
      />
      <SeoRail
        title="Latest contents"
        subtitle={DISCOVER_RAIL_SUBTITLES.latest}
        items={catalog.latest as ContentRow[]}
      />
      <SeoRail
        title="Spotlight"
        subtitle={DISCOVER_RAIL_SUBTITLES.spotlight}
        items={catalog.spotlight as ContentRow[]}
      />
      <SeoRail
        title="Recommended for you"
        subtitle={DISCOVER_RAIL_SUBTITLES.recommended}
        items={catalog.recommended as ContentRow[]}
      />
      <SeoRail
        title="Most tipped"
        subtitle={DISCOVER_RAIL_SUBTITLES.mostTipped}
        items={catalog.mostTipped as ContentRow[]}
      />
      {catalog.programs.length > 0 ? (
        <section aria-label="Programs">
          <h2>Programs</h2>
          <p>{DISCOVER_RAIL_SUBTITLES.programs}</p>
          <ul>
            {(
              catalog.programs as Array<{
                id: string;
                title: string;
                landingUrl?: string | null;
              }>
            )
              .slice(0, 12)
              .map(program => {
                const href =
                  typeof program.landingUrl === "string" &&
                  program.landingUrl.startsWith("/")
                    ? program.landingUrl
                    : null;
                if (!href) return null;
                return (
                  <li key={program.id}>
                    <Link href={href}>{program.title}</Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ) : null}
      {liveStreamItems.length > 0 ? (
        <section aria-label="Live streams">
          <h2>Live streams</h2>
          <p>{DISCOVER_RAIL_SUBTITLES.live}</p>
          <ul>
            {liveStreamItems
              .map(row => {
                const href = liveStreamHref(row);
                return href ? { href, title: row.title, id: row.id } : null;
              })
              .filter((x): x is { href: string; title: string; id: string } =>
                Boolean(x)
              )
              .slice(0, 12)
              .map(link => (
                <li key={link.id}>
                  <Link href={link.href}>{link.title}</Link>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
      {(catalog.tippers as TipperRow[]).length > 0 ? (
        <section aria-label="Top tippers">
          <h2>Top tippers</h2>
          <ul>
            {(catalog.tippers as TipperRow[]).slice(0, 12).map(tipper => (
              <li key={tipper.id}>{tipper.username ?? tipper.id}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {(catalog.topCommunities as CommunityRow[]).length > 0 ? (
        <section aria-label="Top communities">
          <h2>Top communities</h2>
          <ul>
            {(catalog.topCommunities as CommunityRow[]).slice(0, 12).map(c => (
              <li key={c.id}>
                <Link href={exploreCommunityJoinHref(c.id)}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
