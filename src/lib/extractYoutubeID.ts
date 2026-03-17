export function extractYoutubeID(url: string): string {
  try {
    const parsed = new URL(url);

    // youtu.be/VIDEO_ID
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1);
    }

    // watch?v=VIDEO_ID
    if (parsed.searchParams.has("v")) {
      const v = parsed.searchParams.get("v");
      return v ?? ""; // fallback to empty string
    }

    // embed, live, shorts
    const pathMatch = parsed.pathname.match(/^\/(embed|live|shorts)\/([^/?]+)/);
    return pathMatch ? pathMatch[2] : "";
  } catch {
    return "";
  }
}
