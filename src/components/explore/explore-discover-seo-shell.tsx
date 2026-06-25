import Link from "next/link";

import { loadDiscoverCatalogServer } from "@/lib/discover-catalog-server";
import { buildContentShareUrl } from "@/lib/public-video-url";
import { DISCOVER_RAIL_SUBTITLES } from "@/lib/event-type-options";

type ContentRow = {
  id: string;
  title: string;
  event?: { id?: string };
};

function contentHref(row: ContentRow): string | null {
  const eventId = row.event?.id?.trim();
  if (!eventId || !row.id) return null;
  return buildContentShareUrl({ eventId, channelId: row.id });
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
  const catalog = await loadDiscoverCatalogServer();

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
            {(catalog.programs as Array<{
              id: string;
              title: string;
              landingUrl?: string | null;
            }>)
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
    </div>
  );
}
