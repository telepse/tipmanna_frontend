import { extractYoutubeID } from "./extractYoutubeID";

export const validateYoutubePlayback = async (url: string) => {
  const id = extractYoutubeID(url);

  if (!id) return { valid: false, message: "Invalid YouTube link" };

  const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  try {
    const res = await fetch(thumbnail, { method: "HEAD" });

    if (!res.ok) {
      return { valid: false, message: "Video not found" };
    }

    return { valid: true };
  } catch {
    return { valid: false, message: "Unable to verify video" };
  }
};
