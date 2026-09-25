"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import {
  getHostDefaultChannelsAction,
  type HostDefaultChannelItem,
} from "@/actions/events";
import { ManageEventCard } from "@/components/dashboard/manage-event-card";
import { ManageEventCardSkeleton } from "@/components/dashboard/manage-event-card-skeleton";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import type { RootState } from "@/redux/store";

export function HostChannelManageClient() {
  const user = useSelector((s: RootState) => s.auth.user);
  const [items, setItems] = useState<HostDefaultChannelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionPrompt = useHostSubscriptionPrompt({
    focusTier: "premium",
  });

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void getHostDefaultChannelsAction().then(res => {
      if (cancelled) {
        return;
      }

      if (res.success && res.data && Array.isArray(res.data.items)) {
        setItems(res.data.items);
      } else {
        setItems([]);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <ManageEventCardSkeleton key={idx} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No default channels found. Each event room needs at least one video
        channel; the default channel is shown here for premium display controls.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {items.map(item => (
          <ManageEventCard
            key={item.id}
            variant="channel"
            id={item.id}
            eventName={item.eventName}
            eventDate={item.eventDate}
            startTime={item.startTime}
            endTime={item.endTime}
            approved={item.approved}
            amountRaised={item.amountRaised}
            numOfTips={item.numOfTips}
            showAmountRaisedOnVideos={item.showAmountRaisedOnVideos}
            showViewCountOnVideos={item.showViewCountOnVideos}
            showEncounterOnVideos={item.showEncounterOnVideos}
            defaultChannel={item.defaultChannel}
            subscriptionPrompt={subscriptionPrompt}
          />
        ))}
      </div>
      {subscriptionPrompt.SubscriptionPromptModal}
    </>
  );
}
