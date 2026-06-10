import { getPublicAbsoluteUrl } from "@/lib/site-config";

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
  const url = buildTvShareUrl(communityId);
  try {
    await navigator.clipboard.writeText(url);
    return;
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
}
