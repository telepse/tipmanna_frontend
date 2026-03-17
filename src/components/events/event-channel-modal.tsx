"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { toast } from "react-toastify";
import { ApiError } from "@/types/api-error.types";
import {
  createEventChannelAction,
  updateDefaultChannel,
} from "@/actions/events";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";

interface Video {
  id: number;
  url: string;
  tips: number;
}

interface EventChannel {
  id: string;
  name: string;
  isDefault?: boolean;
  title: string;
  videos: Video[];
  mainVideoIndex: number;
}

interface ChannelModalProps {
  open: boolean;
  onClose: () => void;
  channels: EventChannel[];
  isHost: boolean;
  eventId: string;
  frameId: string;
  liveVideoLink: string;
}

type EventVideoFormValues = {
  title: string;
  url: string;
  isLive: boolean;
  setReminder: boolean;
  reminders: {
    r1?: number;
    r2?: number;
    r3?: number;
  };
};

const reminderKeys = ["r1", "r2", "r3"] as const;

export const EventChannelModal = ({
  open,
  onClose,
  channels,
  isHost,
  eventId,
  frameId,
  liveVideoLink,
}: ChannelModalProps) => {
  const form = useForm<EventVideoFormValues>({
    defaultValues: {
      title: "",
      url: "",
      isLive: false,
      setReminder: false,
      // reminders: {},
    },
  });

  // Loading state
  const [loading, setLoading] = useState(false);

  const setReminder = form.watch("setReminder");

  const [defaultChannelId, setDefaultChannelId] = useState<string | null>(
    channels.find(c => c.isDefault)?.id || null
  );
  const [updatingDefault, setUpdatingDefault] = useState(false);

  const router = useRouter();

  const onSubmit = async (values: EventVideoFormValues) => {
    try {
      setLoading(true);

      const res = await createEventChannelAction(
        { title: values.title, url: values.url, isLive: values.isLive },
        eventId
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const { message } = res.data;

      toast.success(message);

      router.refresh();

      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to create event channel");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultChannel = async (channelId: string) => {
    setUpdatingDefault(true);

    try {
      // Call your Next.js 15 server action
      await updateDefaultChannel(eventId, channelId);

      setDefaultChannelId(channelId); // Update local state
      toast.success("Default channel updated!");

      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to set default channel");
      }
    } finally {
      setUpdatingDefault(false);
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(
        `${process.env.NEXT_PUBLIC_FRONTEND_APP_URL}/room/${eventId}?frame=${id}`
      );
      setCopiedId(id);
      setTimeout(() => setCopiedId(id), 2000);

      toast.success("Frame link copied");
    } catch {
      // Fallback
      console.error("Failed to copy link");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="sm:max-w-nd max-h-[70vh] w-full overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>Add Channel Videos</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* Video Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My awesome event"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* URL */}
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Live Video Switch */}
            <FormField
              control={form.control}
              name="isLive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Is it a live video?</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Set Reminder Switch */}
            <FormField
              control={form.control}
              name="setReminder"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Send reminders for tips and donations</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Reminder Inputs */}
            {setReminder && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Send reminder after
                </p>

                <div className="grid grid-cols-3 gap-4">
                  {reminderKeys.map(key => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={`reminders.${key}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                placeholder=""
                                {...field}
                                onChange={e =>
                                  field.onChange(
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value)
                                  )
                                }
                                className="h-8 w-10"
                              />{" "}
                              <span>mins</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Saving video..." : "Save video"}
            </Button>

            <div className="text-sm">{liveVideoLink}</div>

            {channels.map(channel => (
              <div
                key={channel.id}
                className="flex items-center gap-2"
              >
                <Checkbox
                  checked={defaultChannelId === channel.id}
                  onCheckedChange={() => handleSetDefaultChannel(channel.id)}
                  disabled={!isHost || updatingDefault}
                />
                {channel.title}{" "}
                {copiedId === channel.id ? (
                  <Check className="size-4" />
                ) : (
                  <Copy
                    onClick={() => handleCopy(channel.id)}
                    className="size-4"
                  />
                )}
                {defaultChannelId === channel.id && (
                  <span className="ml-2 text-sm text-green-600">Default</span>
                )}
              </div>
            ))}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
