export type TipUsageType =
  | "PERFORMER_WELFARE"
  | "HOST_WELFARE"
  | "COHOST_WELFARE"
  | "CUSTOM";

export interface TipUsageDisclosure {
  id?: string;
  usageType: TipUsageType;
  percentage: number;
  customLabel?: string | null;
  enabled?: boolean; // Optional for frontend use
}
