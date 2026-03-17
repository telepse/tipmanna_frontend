import { extractYoutubeID } from "./extractYoutubeID";

export const validateYoutubePlayback = async (url: string) => {
  const videoId = extractYoutubeID(url);

  if (!videoId) return { valid: false, message: "Invalid YouTube URL" };

  try {
    // Always use the canonical watch URL for oEmbed
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${canonicalUrl}&format=json`
    );

    if (!res.ok) {
      return { valid: false, message: "Video not found or not playable" };
    }

    return { valid: true, message: "" };
  } catch (err) {
    return { valid: false, message: "Unable to verify video" };
  }
};
