export interface KeyStat {
  totalTipsReceived: number;
  successfulTransactions: number;
  /** Unique paying tippers and visitors (successful transactions). */
  uniqueTippersAndVisitors: number;
  /** Uploaded / channel videos with a YouTube-style URL. */
  activeYoutubeLinks: number;
  /**
   * All-time content views: playback sessions with ≥10s watch time summed across
   * every video on tv/channel/content/explore/etc. surfaces.
   */
  contentViews: number;
}
