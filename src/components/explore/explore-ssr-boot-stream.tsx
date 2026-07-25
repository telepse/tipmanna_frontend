import { ExploreSeoJsonLd } from "@/components/explore/explore-seo-jsonld";
import { logExploreSsrBoot } from "@/lib/explore-observability";
import {
  resolveExploreSsrBoot,
  serializeExploreSsrBootScript,
} from "@/lib/explore-ssr-boot";

/**
 * Streams inline boot + ItemList JSON-LD after the Explore shell renders.
 * ExplorePageClient mounts immediately with ssrBoot=null; feed may consume
 * window.__EXPLORE_SSR_BOOT__ via takeExploreFeedBoot or client prefetch fallback.
 */
export async function ExploreSsrBootStream({
  searchParamsKey = "",
}: {
  searchParamsKey?: string;
}) {
  const started = performance.now();
  let outcome: "ok" | "timeout" | "empty" | "error" = "error";
  try {
    const ssrBoot = await resolveExploreSsrBoot(searchParamsKey);
    const bootScript =
      ssrBoot?.items?.length && ssrBoot.items.length > 0
        ? serializeExploreSsrBootScript(ssrBoot)
        : null;
    outcome = bootScript ? "ok" : "empty";

    logExploreSsrBoot({
      outcome,
      durationMs: performance.now() - started,
    });

    return (
      <>
        {bootScript ? (
          <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        ) : null}
        <ExploreSeoJsonLd items={ssrBoot?.items} />
      </>
    );
  } catch {
    logExploreSsrBoot({
      outcome: "error",
      durationMs: performance.now() - started,
    });
    return null;
  }
}
