"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Third-party imports
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Calendar, Copy, TrendingUp, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import type { HostPayoutSummaryBlock } from "@/actions/host-payouts";
import type { HostStatsSummary } from "@/hooks/useHostStats";
import { EventStatCard } from "./event-stat-card";
import { RecentEventCard } from "./recent-event-card";
import { PayoutSummaryCard } from "./payout-summary-card";
import { AchievementCard } from "./achievement-card";
import { RootState } from "@/redux/store";
import { GenerateQrButton } from "./generate-qr-button";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";
import { ACHIEVEMENTS } from "@/constants";
import type { Event } from "@/types";
import { usePayoutProfileGuard } from "@/hooks/use-payout-profile-guard";
import { IncompleteProfilePayoutModal } from "@/components/dashboard/incomplete-profile-payout-modal";

interface Props {
  events: Event[];
  stats: HostStatsSummary | null;
  payoutSummary?: HostPayoutSummaryBlock | null;
}

export const HostStats = ({ events, stats, payoutSummary }: Props) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const {
    guardPayoutNavigation,
    modalOpen: payoutModalOpen,
    setModalOpen: setPayoutModalOpen,
    profileLabel,
    profileAccountType,
  } = usePayoutProfileGuard();
  const params = useParams();
  const eventSlug =
    typeof params?.slug === "string"
      ? params.slug
      : user && "eventSlug" in user
        ? user.eventSlug
        : "";

  const [, setCopied] = useState(false);

  if (!user || user.role !== "HOST") return null;
  const eventCode = user!.eventCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(eventCode!);
      setCopied(true);
      toast.success("Event code copied");
    } catch (error) {
      console.error(error);
    }
  };

  const fullLink = getPublicAbsoluteUrl(
    `/join-host/${eventSlug}?eventCode=${encodeURIComponent(String(eventCode))}`
  );

  const totalEventsCreated = stats?.totalEventsCreated ?? 0;
  const totalAttendeesReached = stats?.totalAttendeesReached ?? 0;
  const numOfTips = stats?.totalTips ?? 0;
  const totalAmountRaised = stats?.totalTipsEarned ?? 0;
  const earnings = Number((totalAmountRaised * 0.7).toFixed(2));

  const achievementChecks = [
    totalEventsCreated >= 1,
    totalAttendeesReached >= 1000,
    totalEventsCreated >= 25,
  ];

  const progress =
    (achievementChecks.filter(Boolean).length / achievementChecks.length) * 100;

  const metCount = achievementChecks.filter(Boolean).length;
  const totalCount = achievementChecks.length;
  const fractionProgress = `${metCount}/${totalCount}`;

  const recentEvents = events.slice(0, 5);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-full space-y-6 lg:col-span-7">
        {/* Event statistics */}
        <div className="bg-card space-y-6 rounded-xl border p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Event statistics</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <EventStatCard
              title="Channels Created"
              value={totalEventsCreated}
              icon={Calendar}
            />

            <EventStatCard
              title="Tips"
              value={numOfTips}
              icon={Users}
            />

            <EventStatCard
              title="Tips Received"
              value={totalAmountRaised}
              icon={Wallet}
              isMoney
            />

            <EventStatCard
              title="Earnings"
              value={earnings}
              icon={TrendingUp}
              isMoney
            />
          </div>
        </div>

        {/* Recent events */}
        <div className="bg-card space-y-6 rounded-xl border p-6 shadow-sm">
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              Host event code
              <Button onClick={handleCopy}>
                <Copy /> {eventCode}
              </Button>
            </div>

            <GenerateQrButton link={fullLink} />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent events</h2>
            <Link
              href={`/join-host/${eventSlug}?eventCode=${eventCode}`}
              className="text-muted-foreground"
              target="_blank"
            >
              View all events
            </Link>
          </div>

          <div className="space-y-6">
            {recentEvents.length > 0 ? (
              recentEvents.map(event => (
                <RecentEventCard
                  key={event.id}
                  eventName={event.eventName}
                  eventDate={event.eventDate}
                  numOfTips={event.numOfTips}
                  amountRaised={event.amountRaised}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No events yet. Your recent events will appear here.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-full space-y-6 lg:col-span-5">
        {/* Achievements */}
        <div className="bg-card space-y-6 rounded-xl border p-6 shadow-sm">
          <div className="flex items-end justify-between">
            <h2 className="z-20 [mask-image:linear-gradient(to_bottom,white_80%,transparent_100%)] text-2xl font-semibold">
              Achievements
            </h2>

            <span className="text-muted-foreground">{fractionProgress}</span>
          </div>

          <div className="text-muted-foreground flex justify-between">
            <span>Progress</span>{" "}
            <span>
              {Math.min(Math.max(progress, 0), 100).toFixed(2)}% complete
            </span>
          </div>

          <div className="-mt-4 h-2 w-full overflow-hidden rounded-md bg-black">
            <div
              className="bg-primary h-full"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>

          {ACHIEVEMENTS.map((achievement, index) => {
            const Icon = achievement.icon;
            return (
              <AchievementCard
                key={achievement.title}
                title={achievement.title}
                subtitle={achievement.subtitle}
                icon={Icon}
                iconColor={achievement.iconColor}
                met={achievementChecks[index] ?? false}
              />
            );
          })}
        </div>

        {/* Payout summary */}
        <div className="bg-card space-y-6 rounded-xl border p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Payout summary</h2>
          <div className="space-y-6">
            <PayoutSummaryCard
              label="Pending Payouts"
              value={(payoutSummary?.pendingMinor ?? 0) / 100}
              bgColor="#FFF3E7"
              txtColor="#CB6305"
              isMoney
              subLabel={`Event tips: ${formatGbpMinor(payoutSummary?.pendingByBranch.eventTipsMinor ?? 0)} · Community: ${formatGbpMinor(payoutSummary?.pendingByBranch.communitySubscriptionMinor ?? 0)}`}
            />
            <PayoutSummaryCard
              label="Total Received"
              value={(payoutSummary?.receivedMinor ?? 0) / 100}
              bgColor="#E5FFE3"
              txtColor="#04802E"
              isMoney
              subLabel={`Event tips: ${formatGbpMinor(payoutSummary?.receivedByBranch.eventTipsMinor ?? 0)} · Community: ${formatGbpMinor(payoutSummary?.receivedByBranch.communitySubscriptionMinor ?? 0)}`}
            />

            <Link
              href={`/host/${eventSlug}/revenue`}
              onClick={event => {
                if (!guardPayoutNavigation(event)) return;
              }}
            >
              <Button
                size="lg"
                className="w-full"
              >
                Revenue & payouts →
              </Button>
            </Link>
            <Link href={`/host/${eventSlug}/reports`}>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
              >
                Reports & insights →
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <IncompleteProfilePayoutModal
        open={payoutModalOpen}
        onOpenChange={setPayoutModalOpen}
        settingsUrl={`/host/${eventSlug}/settings?tab=${profileAccountType === "ORGANIZATION" ? "organisation_profile" : "individual_profile"}`}
        profileLabel={profileLabel}
      />
    </div>
  );
};
