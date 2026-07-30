"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import {
  getYoutubeChannelsAction,
  upsertYoutubeChannelAction,
} from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RootState } from "@/redux/store";

type YtRow = {
  slot: number;
  url: string;
  locked?: boolean;
};

export function HostYoutubeChannelsSettings() {
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  const [channels, setChannels] = useState<YtRow[]>([]);
  const [loadingYt, setLoadingYt] = useState(false);
  const [slot1Input, setSlot1Input] = useState("");
  const [slot2Input, setSlot2Input] = useState("");

  useEffect(() => {
    if (!user?.id || user.role !== "HOST") return;

    setLoadingYt(true);

    void getYoutubeChannelsAction(token)
      .then(res => {
        if (res.success && res.data && typeof res.data === "object") {
          const rows = (res.data as { channels?: YtRow[] }).channels;

          if (Array.isArray(rows)) {
            setChannels(rows);
          }
        } else if (!res.success) {
          toast.error(res.message ?? "Could not load your YouTube channels");
        }
      })
      .finally(() => {
        setLoadingYt(false);
      });
  }, [user?.id, user?.role, token]);

  const saveSlot = async (slot: number, url: string) => {
    if (!user?.id) {
      toast.error("Sign in required");
      return;
    }

    const trimmed = url.trim();

    if (!trimmed) {
      toast.error("Enter a YouTube channel URL");
      return;
    }

    const res = await upsertYoutubeChannelAction(
      {
        slot,
        url: trimmed,
        rawUrl: trimmed,
      },
      token
    );

    if (!res.success) {
      toast.error(res.message ?? "Could not save channel");
      return;
    }

    toast.success("YouTube channel saved");

    const refreshed = await getYoutubeChannelsAction(token);

    if (
      refreshed.success &&
      refreshed.data &&
      typeof refreshed.data === "object"
    ) {
      const rows = (refreshed.data as { channels?: YtRow[] }).channels;

      if (Array.isArray(rows)) {
        setChannels(rows);
      }
    }
  };

  return (
    <div className="mt-6 space-y-6 rounded-md border bg-white p-6">
      <div className="space-y-1">
        <h5 className="text-xl font-semibold">YouTube channels</h5>
        <p className="text-muted-foreground text-sm">
          Save your primary and secondary YouTube channels for video ownership
          verification.
        </p>
      </div>

      {loadingYt ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="youtube-slot-1">Primary (slot 1)</Label>

            {channels.find(channel => channel.slot === 1) ? (
              <Input
                id="youtube-slot-1"
                readOnly
                value={channels.find(channel => channel.slot === 1)?.url ?? ""}
                className="mt-1"
              />
            ) : (
              <div className="mt-1 flex gap-2">
                <Input
                  id="youtube-slot-1"
                  value={slot1Input}
                  onChange={event => setSlot1Input(event.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                />

                <Button
                  type="button"
                  onClick={() => saveSlot(1, slot1Input)}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="youtube-slot-2">Secondary (slot 2, optional)</Label>

            {channels.find(channel => channel.slot === 2) ? (
              <Input
                id="youtube-slot-2"
                readOnly
                value={channels.find(channel => channel.slot === 2)?.url ?? ""}
                className="mt-1"
              />
            ) : (
              <div className="mt-1 flex gap-2">
                <Input
                  id="youtube-slot-2"
                  value={slot2Input}
                  onChange={event => setSlot2Input(event.target.value)}
                  placeholder="Optional second channel"
                />

                <Button
                  type="button"
                  onClick={() => saveSlot(2, slot2Input)}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
