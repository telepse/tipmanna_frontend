export type EventTypeOption = { value: string; label: string; slug: string };

export const EXPLORE_EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  { value: "CONCERT_MUSIC", label: "Concert", slug: "concert-music" },
  { value: "DRAMA_ART", label: "Drama", slug: "drama-art" },
  { value: "FESTIVAL", label: "Festival", slug: "festival" },
  { value: "FOOD", label: "Food", slug: "food" },
  { value: "HANG_OUT", label: "Hangout", slug: "hang-out" },
  { value: "ISLAMIC", label: "Islamic", slug: "islamic" },
  { value: "CHRISTIAN", label: "Christian", slug: "christian" },
  { value: "CORPORATE", label: "Corporate", slug: "corporate" },
  { value: "COMEDY", label: "Comedy", slug: "comedy" },
  { value: "FASHION", label: "Fashion", slug: "fashion" },
  { value: "GAME_SPORT", label: "Game & sport", slug: "game-sport" },
  { value: "CHILDREN", label: "Children", slug: "children" },
  { value: "EDUCATION", label: "Education", slug: "education" },
  { value: "OTHER", label: "Other", slug: "other" },
];

export const DISCOVER_RAIL_SUBTITLES: Record<string, string> = {
  top: "Editorially featured",
  latest: "Newest uploads, by date added",
  spotlight: "Trending by views, tips, and saves (updates every ~5 min)",
  recommended: "Popular saves and recency",
  programs: "Scheduled TV programs",
  live: "Opens in the creator's event room",
  mostTipped: "Highest tip counts",
};

/** Extended “how this updates” copy for mobile rail help tooltips. */
export const DISCOVER_RAIL_UPDATE_HINTS: Record<string, string> = {
  top: "Manual curation — updates when admins change the featured list.",
  latest: "Real-time — sorted by newest upload (createdAt).",
  spotlight: "Recalculated about every 5 minutes from views, tips, saves, and recency.",
  recommended: "Recalculated about every 5 minutes from saves and recency.",
  programs: "Updates when TV programs are scheduled or change enforcement status.",
  live: "Updates when live status changes (live, upcoming, or recently ended).",
  mostTipped: "Real-time — sorted by highest tip counts.",
};

export type DiscoverRailKey = keyof typeof DISCOVER_RAIL_SUBTITLES;

export function eventTypeOptionBySlug(slug: string): EventTypeOption | undefined {
  const normalized = slug.trim().toLowerCase();
  return EXPLORE_EVENT_TYPE_OPTIONS.find(
    opt => opt.slug === normalized || opt.value.toLowerCase() === normalized
  );
}

export function eventTypeLabel(value: string | null | undefined): string {
  if (!value) return "Other";
  return (
    EXPLORE_EVENT_TYPE_OPTIONS.find(
      opt => opt.value.toLowerCase() === value.toLowerCase()
    )?.label ?? value.replace(/_/g, " ").toLowerCase()
  );
}
