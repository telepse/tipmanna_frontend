import { extractYoutubeID } from "@/lib/extractYoutubeID";

export const validateVideoLink = async (url: string) => {
  const id = extractYoutubeID(url);

  if (!id) {
    return { valid: false, message: "Invalid YouTube link" };
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
    );

    if (!res.ok) {
      return {
        valid: false,
        message: "Video not found or not accessible",
      };
    }

    const data = await res.json();

    return {
      valid: true,
      title: data.title,
      thumbnail: data.thumbnail_url,
    };
  } catch {
    return { valid: false, message: "Unable to verify video" };
  }
};
