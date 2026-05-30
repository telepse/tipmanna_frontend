import { getPublicAbsoluteUrl } from "@/lib/site-config";

export function globalProgramLandingUrl(enforcementId: string): string {
  return getPublicAbsoluteUrl(`/program/${encodeURIComponent(enforcementId)}`);
}

export function communityProgramLandingUrl(
  communityId: string,
  enforcementId: string
): string {
  return getPublicAbsoluteUrl(
    `/c/${encodeURIComponent(communityId)}/program/${encodeURIComponent(enforcementId)}`
  );
}

export async function copyProgramLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
