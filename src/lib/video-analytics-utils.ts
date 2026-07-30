export type VideoOverviewApiRow = {
  totalWatchDuration?: number;
  totalNumberOfPayments?: number;
  totalNumberOfUsers?: number;
  uniqueVideoCount?: number;
  mobileActors?: number;
  desktopActors?: number;
  shareCount?: number;
  commentCount?: number;
  saveCount?: number;
  encounterCount?: number;
  completeCount?: number;
};

export type VideoOverviewPerSurfaceStats = {
  totalWatchDuration: number;
  totalNumberOfPayments: number;
  totalNumberOfUsers: number;
  uniqueVideoCount: number;
  mobileActors: number;
  desktopActors: number;
  shareCount: number;
  commentCount: number;
  saveCount: number;
  encounterCount: number;
  completeCount: number;
};

const emptyOverviewStats: VideoOverviewPerSurfaceStats = {
  totalWatchDuration: 0,
  totalNumberOfPayments: 0,
  totalNumberOfUsers: 0,
  uniqueVideoCount: 0,
  mobileActors: 0,
  desktopActors: 0,
  shareCount: 0,
  commentCount: 0,
  saveCount: 0,
  encounterCount: 0,
  completeCount: 0,
};

export function getVideoOverviewPerSurfaceStats(
  rows: VideoOverviewApiRow[]
): VideoOverviewPerSurfaceStats {
  return rows.reduce<VideoOverviewPerSurfaceStats>(
    (acc, row) => {
      const w =
        typeof row.totalWatchDuration === "number" ? row.totalWatchDuration : 0;
      return {
        totalWatchDuration: acc.totalWatchDuration + w,
        totalNumberOfPayments:
          acc.totalNumberOfPayments + (row.totalNumberOfPayments ?? 0),
        totalNumberOfUsers:
          acc.totalNumberOfUsers + (row.totalNumberOfUsers ?? 0),
        uniqueVideoCount: acc.uniqueVideoCount + (row.uniqueVideoCount ?? 0),
        mobileActors: acc.mobileActors + (row.mobileActors ?? 0),
        desktopActors: acc.desktopActors + (row.desktopActors ?? 0),
        shareCount: acc.shareCount + (row.shareCount ?? 0),
        commentCount: acc.commentCount + (row.commentCount ?? 0),
        saveCount: acc.saveCount + (row.saveCount ?? 0),
        encounterCount: acc.encounterCount + (row.encounterCount ?? 0),
        completeCount: acc.completeCount + (row.completeCount ?? 0),
      };
    },
    emptyOverviewStats
  );
}

export const HOST_OVERVIEW_SURFACES = [
  { key: "tv_looper", label: "TV looper" },
  { key: "event_room", label: "Event room" },
  { key: "channel_client", label: "Channel client" },
  { key: "content_client", label: "Content client" },
  { key: "explore_feed", label: "Explore client" },
  { key: "homepage_preview", label: "Homepage TV preview" },
] as const;

export const HOST_SURFACE_EVENT_TABS = [
  { key: "tv_looper", label: "TV looper" },
  { key: "explore_feed", label: "Explore feed" },
  { key: "event_room", label: "Event room" },
  { key: "homepage_preview", label: "Homepage preview" },
  { key: "channel_client", label: "Channel client" },
  { key: "content_client", label: "Content client" },
] as const;
