export type ProgramBootstrapItem = {
  id: string;
  position: number;
  title: string;
  durationSec: number;

  channelId: string;
  eventId: string;

  contentUrl: string | null;
  thumbnailUrl: string | null;

  description: string | null;
  amountRaised: number;

  creator: {
    id: string;
    name: string;
    username: string;
  } | null;

  coOwners: {
    id: string;
    name: string;
    email: string;
  }[];

  stats: {
    tips: number;
    saves: number;
    shares: number;
    comments: number;
    encounters: number;
    views: number;
  };
};

export type ProgramBootstrap = {
  id: string;
  title: string;
  kind: string;
  status: string;
  scheduledAt: string;
  durationSec: number;
  community: {
    id: string;
    name: string;
    logoUrl: string | null;
  } | null;
  items: ProgramBootstrapItem[];
  watchAllUrl: string;
  shareUrl: string;
  airWindow: { startUtc: string; endUtc: string };
  reminderConfig: {
    defaultOffset: number;
    options: number[];
    supportedChannels: string[];
  };
  /** Community program landing hero (nullable). Global programs use null. */
  landingBannerUrl: string | null;
};
