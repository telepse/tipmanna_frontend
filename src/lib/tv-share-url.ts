import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { copyShareUrl } from "@/lib/copy-share-url";

/** Shareable /tv link for global or community TV. */
export function buildTvShareUrl(communityId?: string | null): string {
  const cid = communityId?.trim();
  if (cid) {
    return getPublicAbsoluteUrl(`/tv?community=${encodeURIComponent(cid)}`);
  }
  return getPublicAbsoluteUrl("/tv");
}

export async function copyTvShareUrl(
  communityId?: string | null
): Promise<void> {
  await copyShareUrl(buildTvShareUrl(communityId));
}
