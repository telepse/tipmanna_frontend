export interface KeyStatLastWeek {
  totalTipsReceived: number;
  successfulTransactions: number;
  activeYoutubeLinks: number;
  communitiesCreated: number;
  totalEncounters: number;
}

export interface KeyStat {
  totalTipsReceived: number;
  successfulTransactions: number;
  /** Unique paying tippers and visitors (successful transactions). */
  uniqueTippersAndVisitors: number;
  /** Uploaded / channel videos with a YouTube-style URL. */
  activeYoutubeLinks: number;
  /** Non-system communities created on the platform. */
  communitiesCreated: number;
  /** Platform-wide TV clip encounters (`video_encounter` rollups). */
  totalEncounters: number;
  /**
   * All-time content views: playback sessions with ≥10s watch time summed across
   * every video on tv/channel/content/explore/etc. surfaces.
   */
  contentViews: number;
  /** Positive net change over the trailing 7 days (only shown in UI when > 0). */
  lastWeek: KeyStatLastWeek;
}
