import * as z from "zod";

export const CREATOR_PROFILE_CATEGORIES = [
  "content_creator",
  "media_personality",
  "public_figure",
  "entertainer",
  "musician",
  "community",
  "event_creator",
] as const;

export type CreatorProfileCategory =
  (typeof CREATOR_PROFILE_CATEGORIES)[number];

export const HOST_CREATOR_DEFAULT_TABS = [
  "all_videos",
  "channels",
  "events",
  "communities",
  "playlists",
] as const;

export type HostCreatorDefaultTab = (typeof HOST_CREATOR_DEFAULT_TABS)[number];

export const HOST_CREATOR_DEFAULT_TAB_LABELS: Record<
  HostCreatorDefaultTab,
  string
> = {
  all_videos: "All videos",
  channels: "Channels",
  events: "Events",
  communities: "Communities",
  playlists: "Playlists",
};

export type CreatorProfileEditStats = {
  pageVisits90d: number;
  pendingHostPayoutMinor: number;
  pendingCoOwnerPayoutPence: number;
};

export const CREATOR_PROFILE_CATEGORY_LABELS: Record<
  CreatorProfileCategory,
  string
> = {
  content_creator: "Content creator",
  media_personality: "Media personality",
  public_figure: "Public figure",
  entertainer: "Entertainer",
  musician: "Musician",
  community: "Community",
  event_creator: "Event creator",
};

export function formatCreatorProfileCategoryLabel(
  value: string | null | undefined
): string {
  if (!value) return CREATOR_PROFILE_CATEGORY_LABELS.content_creator;
  return (
    CREATOR_PROFILE_CATEGORY_LABELS[value as CreatorProfileCategory] ??
    value.replace(/_/g, " ")
  );
}

export const creatorSchema = z
  .object({
    username: z.string().min(2, "Username must be at least 2 characters"),
    pageDescription: z
      .string()
      .max(500, "Page description is too long")
      .optional()
      .or(z.literal("")),
    profileCategory: z.enum(CREATOR_PROFILE_CATEGORIES).nullable().optional(),
    profileImageUrl: z.string().nullable().optional(),
    externalLinkUrl: z.string().optional().or(z.literal("")),
    externalLinkLabel: z.string().max(100).optional().or(z.literal("")),
    creatorDefaultTab: z.enum(HOST_CREATOR_DEFAULT_TABS).optional(),
  })
  .superRefine((data, ctx) => {
    const url = data.externalLinkUrl?.trim() ?? "";
    const label = data.externalLinkLabel?.trim() ?? "";
    if ((url && !label) || (!url && label)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "External link requires both a URL and a label",
        path: ["externalLinkUrl"],
      });
    }
    if (url && !/^https?:\/\//i.test(url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL must start with http:// or https://",
        path: ["externalLinkUrl"],
      });
    }
  });

export type CreatorFormData = z.infer<typeof creatorSchema>;

export type HostCreatorProfileEdit = {
  username: string;
  profileImageUrl: string | null;
  pageDescription: string | null;
  profileCategory: CreatorProfileCategory | null;
  externalLink: { url: string; label: string } | null;
  usernameChangedAt: string | null;
  usernameChangeOverride: boolean;
  canChangeUsername: boolean;
  nextUsernameChangeAt: string | null;
  hasActivePremium: boolean;
  profilePhotoChangeRequiresPremium: boolean;
  externalLinkRequiresPremium: boolean;
  creatorDefaultTab: HostCreatorDefaultTab;
  editStats: CreatorProfileEditStats;
  creatorPayoutVerifiedAt?: string | null;
};
