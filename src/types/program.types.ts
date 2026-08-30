export type Program = {
  id: string;
  title: string;
  scheduledAt: string;
  programStatus: "Not started" | "Ongoing" | "Completed";
  communityName: string;
  landingUrl: string;
};

export type DiscoveryProgram = {
  id: string;
  title: string;
  scheduledAt: string;
  durationSec?: number;
  status?: string;
  programStatus: string;
  imageUrl: string | null;
  landingUrl: string;
  communityId: string | null;
  communityName: string;
};
