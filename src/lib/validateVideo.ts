import { validateYoutubePlayback } from "./playbackValidator";

export const validateVideoLink = async (url: string) => {
  if (!url) return { valid: true, message: "" }; // allow empty optional fields
  const result = await validateYoutubePlayback(url);
  return {
    valid: result.valid,
    message: result.valid ? "" : "Invalid video link",
  };
};
