"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Check, Copy } from "lucide-react";

import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { listMyCommunitySendsAction } from "@/actions/communities";
import { copyShareUrl } from "@/lib/copy-share-url";
import type { RootState } from "@/redux/store";

type SendItem = {
  id: string;
  status: string;
  community: { id: string; name: string };
  channel: {
    id: string;
    title: string;
    url: string;
    shareUrl: string;
  };
  metrics: {
    numOfTips: number;
    completes: number;
    encounters: number;
    amountRaised: number;
    durationSeconds?: number;
  };
};

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

function SendRow({ item }: { item: SendItem }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!item.channel.shareUrl) {
      toast.error("Could not build video link");
      return;
    }
    try {
      await copyShareUrl(item.channel.shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="bg-card rounded-md border p-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {item.community.name}
      </p>
      <p className="mt-1 font-medium">{item.channel.title}</p>
      <p className="text-muted-foreground mt-1 truncate text-xs">
        {item.channel.url}
      </p>
      <div className="text-muted-foreground mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <span>Tips: {item.metrics.numOfTips}</span>
        <span>Raised: £{Number(item.metrics.amountRaised).toFixed(2)}</span>
        <span>Completes: {item.metrics.completes}</span>
        <span>Views: {item.metrics.encounters}</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={copy}
      >
        {copied ? (
          <>
            <Check className="mr-1 size-4" /> Copied
          </>
        ) : (
          <>
            <Copy className="mr-1 size-4" /> Copy link
          </>
        )}
      </Button>
    </div>
  );
}

export function CommunitySendsClient() {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const [items, setItems] = useState<SendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await listMyCommunitySendsAction();
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load sends");
      setItems([]);
      setLoading(false);
      return;
    }
    const raw = res.data as { items?: SendItem[] };
    setItems(raw.items ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!communityFeatureOn) return;
    void load();
  }, [load]);

  if (!communityFeatureOn) {
    return (
      <p className="text-muted-foreground text-sm">
        Community features are disabled. Set{" "}
        <code className="text-xs">
          NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED=true
        </code>{" "}
        to enable this page.
      </p>
    );
  }

  return (
    <>
      <DashboardHeading
        title="Community Sends"
        subtitle="Your submissions across every community you co-create, in one list."
      />

      <div className="mt-6">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You have no community submissions yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(item => (
              <SendRow
                key={item.id}
                item={item}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
