/** Strip unverified YouTube slot claims before create/submit payloads. */

export type YoutubeClaimFields = {
  onYoutubeChannelSlot?: number | null;
  isOnHostYoutube?: boolean;
};

/** Keep slot claim only when the host completed optional verify. */
export function sanitizeYoutubeClaimForSubmit<T extends YoutubeClaimFields>(
  link: T
): T {
  const slot = link.onYoutubeChannelSlot;
  const claimed = link.isOnHostYoutube === true && (slot === 1 || slot === 2);
  if (claimed) {
    return {
      ...link,
      onYoutubeChannelSlot: slot,
      isOnHostYoutube: true,
    };
  }
  return {
    ...link,
    onYoutubeChannelSlot: null,
    isOnHostYoutube: false,
  };
}

export function sanitizeYoutubeClaimsForSubmit<T extends YoutubeClaimFields>(
  links: T[] | undefined | null
): T[] {
  if (!links?.length) return [];
  return links.map(sanitizeYoutubeClaimForSubmit);
}
