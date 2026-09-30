"use client";

import { ManageEventCard } from "@/components/dashboard/manage-event-card";
import { ManageEventCardSkeleton } from "@/components/dashboard/manage-event-card-skeleton";
import { useHostDefaultChannels } from "@/hooks/useHostDefaultChannels";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";

export function HostChannelManageClient() {
  const { items, hasData, isLoading } = useHostDefaultChannels();
  const subscriptionPrompt = useHostSubscriptionPrompt({
    focusTier: "premium",
  });

  if (isLoading && !hasData) {
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
