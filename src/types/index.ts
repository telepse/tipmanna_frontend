/* eslint-disable @typescript-eslint/no-explicit-any */
export type ApiError = { error: { status: number; message: string } };

export type ResourceRequested = {
  id: string;
  name: string;
  amount: number;
};

export interface TipUsageDisclosure {
  id: string;
  usageType: string;
}

import type { EventSubmissionKind } from "@/lib/event-submission-kind";

export type Event = {
  id: string;
  eventName: string;
  organizationName: string;
  venueName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueLocation: string;
  numOfTips: number;
  totalTipped: number;
  amountRaised: number;
  rating: number;
  characters: Character[];
  approved: boolean;
  rejected: boolean;
  submissionKind?: EventSubmissionKind | null;
  performers: [];
  amountToRaise: number;
  resourcesRequested: ResourceRequested[];
  hostCredit: number;
  hostBonus: number;
  bonusAdded: number;
  bonusRemoved: number;
  feesPaid: number;
  hostCreditAfterApproval: number;
  hostBonusAfterApproval: number;
  hostName: string;
  eventBanner: string;
  tipsReceived: number;
  earnings: string;
  commission: string;
  stripeFees: number;
  eventServices: number;
  payoutPaid: boolean;
  payoutDate: string;
  eventBackground: string;
  showLatestAmount: boolean;
  hideProgressBarAmount: boolean;
  tipUsageDisclosure: TipUsageDisclosure[];
  accessMode: string;
  eventReminders: string;
};

export type Message = {
  [x: string]: any;

  id: string;
  sender: string;
  role?: "host" | "user" | "anon";
  createdAt: string;
  text: string;
  tip?: number;
  secondaryText?: string;
  purchasedSummary?: string;
  imageUrls?: string[];
};

export type RoomCharacter = {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
  styleName: string;
};

export type Character = {
  name: string;
  time: string;
  price: number;
  purchasedAt: string;
};

// types.ts
export type VisitorEvent = {
  id: string;
  eventName: string;
  organizationName: string;
  venueName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueLocation: string;
  numOfTips: number;
  totalTipped: number;
  rating: number;
  characters: Character[];
};

export type Transaction = {
  purchaseTime: string;
  tipperName: string;
  amount: number;
  characterNames: string[];
  eventName: string;
  stripeFee: number;
};

export type EventFees = {
  hostCredit: number;
  appliedFees: number;
  hostBonus: number;
};
