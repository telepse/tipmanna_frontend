// export function extractYoutubeID(url: string): string {
//   try {
//     const parsed = new URL(url);

//     // youtu.be/VIDEO_ID
//     if (parsed.hostname === "youtu.be") {
//       return parsed.pathname.slice(1);
//     }

//     // watch?v=VIDEO_ID
//     if (parsed.searchParams.has("v")) {
//       const v = parsed.searchParams.get("v");
//       return v ?? ""; // fallback to empty string
//     }

//     // embed, live, shorts
//     const pathMatch = parsed.pathname.match(/^\/(embed|live|shorts)\/([^/?]+)/);
//     return pathMatch ? pathMatch[2] : "";
//   } catch {
//     return "";
//   }
// }

// export const getYoutubeThumbnail = (url: string) => {
//   const id = extractYoutubeID(url);
//   return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
// };

export const extractYoutubeID = (url: string): string | null => {
  try {
    const parsed = new URL(url);

    // youtu.be/ID
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1);
    }

    // youtube.com/watch?v=ID
    const v = parsed.searchParams.get("v");
    if (v) return v;

    // youtube.com/live/ID
    if (parsed.pathname.includes("/live/")) {
      return parsed.pathname.split("/live/")[1];
    }

    // youtube.com/embed/ID
    if (parsed.pathname.includes("/embed/")) {
      return parsed.pathname.split("/embed/")[1];
    }

    // youtube.com/shorts/ID
    if (parsed.pathname.includes("/shorts/")) {
      return parsed.pathname.split("/shorts/")[1];
    }

    return null;
  } catch {
    return null;
  }
};

export const getYoutubeThumbnail = (url: string) => {
  const id = extractYoutubeID(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};
