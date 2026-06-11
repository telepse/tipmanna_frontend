/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

// Third-party imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Bell,
  Bookmark,
  Calendar,
  Goal,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";

// Local imports
import { PROFILE_AWARDS } from "@/constants";
import { RootState } from "@/redux/store";
import { Button } from "@/components/ui/button";
import { TipperWalletDialog } from "@/components/payments/tipper-wallet-entry";
import { useTipperWalletStatus } from "@/hooks/use-tipper-wallet-status";
import { ProfileCharacterCard } from "./profile-character-card";
import { ProfileEventCard } from "./profile-event-card";
import { Paragraph } from "../shared/paragraph";
import Charities from "../home/charities";
import { EventSummaryCard } from "./event-summary-card";
import { ProfileMilestoneCard } from "./profile-milestone-card";
import { ProfileAwardCard } from "./profile-award-card";
import { Character, Event } from "@/types";
import {
  fetchWalletTransactions,
  type WalletLedgerRow,
} from "@/lib/wallet-client";
import { PushPermissionPrompt } from "@/components/notifications/push-permission-prompt";
import { NotificationsTab } from "@/components/notifications/notifications-tab";
import { ReminderBucketTab } from "@/components/notifications/reminder-bucket-tab";
import { SavedTab } from "@/components/notifications/saved-tab";
import { ProfileActivityTab } from "@/components/tipper/profile-activity-tab";
import { Heart } from "lucide-react";

type MilestoneStatus = "locked" | "unlocked";

interface Milestone {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: MilestoneStatus;
  extraInfo?: number | null;
}

export const PROFILE_MILESTONES = [
  {
    id: "tipper_first",
    title: "Tipper",
    description: "Made your first tip to unlock the tipper milestone",
    condition: (tipperEvents: number, totalTipped: number) => tipperEvents >= 1,
  },
  {
    id: "tipper_100",
    title: "Terrific",
    description:
      "Tipped over £100 total in a single event to show your support",
    condition: (tipperEvents: number, totalTipped: number) =>
      totalTipped >= 100,
  },
  {
    id: "tipper_5000",
    title: "Tremendous",
    description: "Tipped over £5000 across all events to become legendary",
    condition: (tipperEvents: number, totalTipped: number) =>
      totalTipped >= 5000,
  },
];

type Cause = {
  id: string;
  logoUrl: string;
  name: string;
};

type TippedVideoSummary = {
  videoChannelId: string;
  videoTitle: string | null;
  eventName: string | null;
  tipCount: number;
  totalAmount: number;
  lastTippedAt: string;
  paymentSurfaces: string[];
};

interface Props {
  events: Event[];
  causes: Cause[];
  contents?: any[];
  tippedVideos?: TippedVideoSummary[];
  variant?: "page" | "drawer";
}

const DRAWER_TABS = [
  "history",
  "wallet",
  "milestones",
  "awards",
  "activity",
] as const;

function walletStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

function formatLedgerKind(kind: string): string {
  if (kind === "DEBIT") return "Tip payment";
  if (kind === "TOPUP") return "Top-up";
  return kind;
}

export const ProfileTabs = ({
  events,
  causes,
  contents,
  tippedVideos = [],
  variant = "page",
}: Props) => {
  const isDrawer = variant === "drawer";
  const [tab, setTab] = useState<
    | "notifications"
    | "reminders"
    | "history"
    | "milestones"
    | "awards"
    | "saved"
    | "wallet"
    | "activity"
  >(isDrawer ? "history" : "notifications");

  const user = useSelector((s: RootState) => s.auth.user);
  const { status: walletLive, refresh: refreshWallet } = useTipperWalletStatus(
    user?.id,
    user?.role
  );

  const [walletTopupOpen, setWalletTopupOpen] = useState(false);
  const [walletTx, setWalletTx] = useState<WalletLedgerRow[]>([]);
  const [txError, setTxError] = useState<string | null>(null);

  const loadWalletTabData = useCallback(async () => {
    await refreshWallet();
    const t = await fetchWalletTransactions();
    setWalletTx(t.items);
    setTxError(t.error);
  }, [refreshWallet]);

  useEffect(() => {
    if (tab !== "wallet") return;
    void loadWalletTabData();
  }, [tab, loadWalletTabData]);

  // Compute tipper event count
  const tipperEventCount = events.length;

  const [selectedEvent, setSelectedEvent] = useState(events?.[0] || null);

  // Determine cumulative unlocked awards
  const unlockedAwardIds = useMemo(() => {
    const ids: string[] = [];
    if (tipperEventCount >= 1) ids.push("local");
    if (tipperEventCount >= 10) ids.push("county");
    if (tipperEventCount >= 20) ids.push("national");
    if (tipperEventCount >= 50) ids.push("global");
    return ids;
  }, [tipperEventCount]);

  const totalTippedAmount = events?.length
    ? events.reduce((sum, ev) => sum + ev.totalTipped, 0)
    : 0;

  const milestonesWithStatus: Milestone[] = PROFILE_MILESTONES.map(
    milestone => {
      let progress = 0;
      let status: MilestoneStatus = "locked";
      let extraInfo: number | null = null; // store number of times milestone was exceeded

      if (milestone.id === "tipper_first") {
        progress = tipperEventCount >= 1 ? 100 : 0;
        status = tipperEventCount >= 1 ? "unlocked" : "locked";
      } else if (milestone.id === "tipper_100") {
        // Count events where totalTipped >= 100
        const countOver100 = events.length
          ? events.filter(ev => ev.totalTipped >= 100).length
          : 0;
        const maxSingleEvent = events.length
          ? Math.max(...events.map(ev => ev.totalTipped))
          : 0;
        progress = Math.min(100, (maxSingleEvent / 100) * 100);
        status = maxSingleEvent >= 100 ? "unlocked" : "locked";
        extraInfo = countOver100; // pass count to card
      } else if (milestone.id === "tipper_5000") {
        progress = Math.min(100, (totalTippedAmount / 5000) * 100);
        status = totalTippedAmount >= 5000 ? "unlocked" : "locked";
      }

      return { ...milestone, progress, status, extraInfo };
    }
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Tabs
        value={tab}
        onValueChange={val =>
          setTab(
            val as
              | "notifications"
              | "reminders"
              | "history"
              | "milestones"
              | "awards"
              | "saved"
              | "wallet"
              | "activity"
          )
        }
        className={isDrawer ? "section gap-4 py-2" : "section gap-8 lg:py-12"}
      >
        <TabsList className="flex !h-auto min-h-14 w-full flex-wrap border bg-white">
          {!isDrawer ? (
            <>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
              >
                <Bell className="hidden size-6 sm:inline-block" /> Notifications
              </TabsTrigger>
              <TabsTrigger
                value="reminders"
                className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
              >
                <Calendar className="hidden size-6 sm:inline-block" /> Reminders
              </TabsTrigger>
            </>
          ) : null}
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
          >
            <TrendingUp className="hidden size-6 sm:inline-block" /> Tipping
            History
          </TabsTrigger>
          <TabsTrigger
            value="wallet"
            className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
          >
            <Wallet className="hidden size-6 sm:inline-block" /> Wallet
          </TabsTrigger>
          <TabsTrigger
            value="milestones"
            className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
          >
            <Goal className="hidden size-6 sm:inline-block" /> Milestones
          </TabsTrigger>
          <TabsTrigger
            value="awards"
            className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
          >
            <Trophy className="hidden size-6 sm:inline-block" /> Awards
          </TabsTrigger>
          {!isDrawer ? (
            <TabsTrigger
              value="saved"
              className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
            >
              <Bookmark className="hidden size-6 sm:inline-block" /> Saves
            </TabsTrigger>
          ) : null}
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
          >
            <Heart className="hidden size-6 sm:inline-block" /> Activity
          </TabsTrigger>
        </TabsList>

        {!isDrawer ? (
          <>
            <TabsContent
              value="notifications"
              className="space-y-4"
            >
              <PushPermissionPrompt />
              <NotificationsTab variant="page" />
            </TabsContent>

            <TabsContent value="reminders">
              <ReminderBucketTab variant="page" />
            </TabsContent>
          </>
        ) : null}

        {/* Tipping history */}
        <TabsContent
          value="history"
          className="space-y-4"
        >
          {tippedVideos && tippedVideos.length > 0 && (
            <div className="border-primary bg-secondary/20 rounded-md border p-4">
              <Paragraph weight="bold">Videos you tipped on</Paragraph>
              <p className="text-muted-foreground mb-3 text-sm">
                Content you supported with a payment, grouped by video.
              </p>
              <div className="max-h-[40vh] space-y-3 overflow-y-auto">
                {tippedVideos?.map(v => (
                  <div
                    key={v.videoChannelId}
                    className="rounded-md border border-white/80 bg-white/90 p-3 text-sm shadow-sm"
                  >
                    <div className="font-semibold text-[#321801]">
                      {v.videoTitle ?? "Untitled video"}
                    </div>
                    {v.eventName ? (
                      <div className="text-muted-foreground text-xs">
                        {v.eventName}
                      </div>
                    ) : null}
                    <div className="mt-1">
                      £{Number(v.totalAmount).toFixed(2)} · {v.tipCount} tip
                      {v.tipCount === 1 ? "" : "s"}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      Last tipped{" "}
                      {new Date(v.lastTippedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {v.paymentSurfaces?.length
                        ? ` · ${v.paymentSurfaces.join(", ")}`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-primary bg-secondary/20 rounded-md border p-4">
            {selectedEvent && (
              <EventSummaryCard
                name={selectedEvent.eventName}
                date={selectedEvent.eventDate}
                total={selectedEvent.totalTipped}
                iTipped={selectedEvent.rating}
              />
            )}

            {/* Profile characters */}
            <div className="mt-4 max-h-[45vh] space-y-4 overflow-y-auto">
              {selectedEvent?.characters?.length ? (
                selectedEvent.characters.map(
                  (char: Character, index: number) => (
                    <ProfileCharacterCard
                      key={index}
                      name={char.name}
                      icon={`/icons/${char.name.toLowerCase().replace(/\s+/g, "-")}.png`} // or use a mapping if you have specific icons
                      time={char.time}
                      price={char.price.toString()}
                      purchasedAt={char.purchasedAt}
                    />
                  )
                )
              ) : (
                <Paragraph
                  size="sm"
                  color="muted"
                >
                  No tips/characters for this event yet.
                </Paragraph>
              )}
            </div>
          </div>

          {/* All events */}
          <Paragraph weight="bold">All Events</Paragraph>
          <div className="space-y-4">
            {events?.length
              ? events.map((item, index) => (
                  <ProfileEventCard
                    key={index}
                    name={item.eventName}
                    date={item.eventDate}
                    rating={item.rating}
                    price={item.totalTipped}
                    isActive={selectedEvent?.eventName === item.eventName}
                    onSelect={() => setSelectedEvent(item)}
                  />
                ))
              : null}
          </div>

          {/* Charities */}
          <Charities causes={causes} />
        </TabsContent>

        <TabsContent
          value="wallet"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Paragraph weight="bold">Tipper Wallet</Paragraph>
            {(user?.role === "TIPPER" || user?.role === "HOST") &&
            !walletLive?.exists ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setWalletTopupOpen(true)}
              >
                Set up wallet
              </Button>
            ) : null}
            {walletLive?.exists && walletLive.status === "ACTIVE" ? (
              <Button
                type="button"
                size="sm"
                className="bg-black text-white"
                onClick={() => setWalletTopupOpen(true)}
              >
                Add funds
              </Button>
            ) : null}
          </div>

          {user?.role !== "TIPPER" && user?.role !== "HOST" ? (
            <Paragraph
              size="sm"
              color="muted"
            >
              Sign in as a tipper or host to manage your wallet here.
            </Paragraph>
          ) : !walletLive?.exists ? (
            <Paragraph
              size="sm"
              color="muted"
            >
              Activate your wallet from any tip flow, or open Add funds after
              you create a wallet.
            </Paragraph>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    walletLive.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-900"
                      : walletLive.status === "DISABLED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {walletStatusLabel(walletLive.status)}
                </span>
                <span>
                  Balance:{" "}
                  <strong>£{Number(walletLive.balance).toFixed(2)}</strong>
                </span>
              </div>
              {walletLive.status === "DISABLED" ? (
                <p className="text-sm text-red-700">
                  Your Tipper Wallet is disabled. Please contact
                  hello@tipmanna.tv for assistance.
                </p>
              ) : null}
            </div>
          )}

          {txError ? <p className="text-sm text-red-600">{txError}</p> : null}

          <div className="max-h-[50vh] space-y-2 overflow-y-auto text-sm">
            {walletTx.length === 0 && !txError ? (
              <Paragraph
                size="sm"
                color="muted"
              >
                No wallet transactions yet.
              </Paragraph>
            ) : (
              walletTx.map(row => (
                <div
                  key={row.id}
                  className="flex flex-wrap justify-between gap-2 rounded-md border bg-white p-3"
                >
                  <span className="font-medium">
                    {formatLedgerKind(row.kind)}
                  </span>
                  <span
                    className={
                      row.kind === "DEBIT" ? "text-red-700" : "text-emerald-800"
                    }
                  >
                    {row.kind === "DEBIT" ? "−" : "+"}£
                    {Number(row.amount).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground w-full text-xs">
                    Balance after £{Number(row.balanceAfter).toFixed(2)} ·{" "}
                    {new Date(row.createdAt).toLocaleString()}
                    {row.eventId ? ` · Event ${row.eventId.slice(0, 8)}…` : ""}
                    {row.stripePaymentIntentId
                      ? ` · Stripe ${row.stripePaymentIntentId.slice(0, 10)}…`
                      : ""}
                  </span>
                </div>
              ))
            )}
          </div>
          <Charities causes={causes} />
        </TabsContent>

        {/* Milestones */}
        <TabsContent
          value="milestones"
          className="space-y-4"
        >
          <Paragraph weight="bold">Your Milestones</Paragraph>
          <div className="space-y-4">
            {milestonesWithStatus.map((item, index) => (
              <ProfileMilestoneCard
                key={index}
                id={item.id}
                title={item.title}
                description={item.description}
                progress={item.progress}
                status={item.status}
                totalTippedAmount={
                  item.id === "tipper_100"
                    ? Math.max(
                        ...(events?.length
                          ? events.map(ev => ev.totalTipped)
                          : [])
                      )
                    : 0
                }
                extraInfo={item.extraInfo || 0}
              />
            ))}
          </div>

          {/* Charities */}
          <Charities causes={causes} />
        </TabsContent>

        <TabsContent
          value="awards"
          className="space-y-4"
        >
          <Paragraph weight="bold">Your Awards</Paragraph>
          {/* <div className="border-primary w-full space-y-4 rounded-md border bg-white p-6 backdrop-blur-md">
            <div className="mx-auto grid "></div>
          </div> */}
          <div className="border-primary w-full space-y-4 rounded-md border bg-white p-2 backdrop-blur-md sm:p-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {PROFILE_AWARDS.map((item, index) => (
                <ProfileAwardCard
                  key={index}
                  id={item.id}
                  label={item.label}
                  desc={item.desc}
                  isActive={unlockedAwardIds.includes(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Charities */}
          <Charities causes={causes} />
        </TabsContent>

        {!isDrawer ? (
          <TabsContent
            value="saved"
            className="space-y-4"
          >
            <SavedTab savedContents={contents ?? []} />
          </TabsContent>
        ) : null}

        <TabsContent
          value="activity"
          className="space-y-4"
        >
          <ProfileActivityTab />
        </TabsContent>
      </Tabs>

      <TipperWalletDialog
        open={walletTopupOpen}
        onOpenChange={setWalletTopupOpen}
        userId={user?.id}
        userRole={user?.role}
        mode="topup"
        eventId={undefined}
        totalAmount={0}
        characters={[]}
        selectedTips={[]}
        paymentSurface="unknown"
        paymentChannelId={null}
        walletSnapshot={walletLive}
        onWalletSnapshotRefresh={refreshWallet}
        onWalletDebitSuccess={() => {
          void loadWalletTabData();
        }}
      />
    </div>
  );
};
