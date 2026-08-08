import * as z from "zod";

export const communityTypeSchema = z.enum([
  "RELIGIOUS",
  "CULTURAL",
  "BUSINESS",
  "HEALTH",
  "FAN_GROUP",
  "INFLUENCER",
  "SOCIAL",
  "EDUCATION",
  "SPORT",
  "CHARITY",
]);

export const COMMUNITY_TYPE_OPTIONS = communityTypeSchema.options;

export const communitySchema = z.object({
  name: z.string().min(2, "Community name must be at least 2 characters"),
  description: z
    .string()
    .max(200, "Community description is too long")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().nullable().optional(),
  type: communityTypeSchema,
});

export type CommunityType = z.infer<typeof communityTypeSchema>;

export type CommunityFormData = z.infer<typeof communitySchema>;

export type HostCommunityCustomization = {
  name: string;
  description: string | null;
  logoUrl: string | null;
  type: CommunityType;
};
