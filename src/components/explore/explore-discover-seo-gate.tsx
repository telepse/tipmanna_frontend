import { headers } from "next/headers";

import { ExploreDiscoverSeoShell } from "@/components/explore/explore-discover-seo-shell";
import { shouldRenderExploreDiscoverSeoShell } from "@/lib/is-crawler-request";

export async function ExploreDiscoverSeoGate({ tab }: { tab?: string }) {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");

  if (!shouldRenderExploreDiscoverSeoShell({ tab, userAgent })) {
    return null;
  }

  return <ExploreDiscoverSeoShell />;
}
