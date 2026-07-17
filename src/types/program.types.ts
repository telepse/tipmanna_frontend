export type Program = {
  id: string;
  title: string;
  scheduledAt: string;
  programStatus: "Not started" | "Ongoing" | "Completed";
  communityName: string;
  landingUrl: string;
};
