"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Third-party imports
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Loader2,
  LoaderCircle,
  MapPin,
  Search,
  Users,
} from "lucide-react";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { LocationPrompt } from "@/components/shared/location-prompt";
import { EventStatus } from "@/components/shared/event-status";
import {
  JoinEventFormData,
  joinEventSchema,
} from "@/schemas/join-event.schema";
import { searchEventsAction } from "@/actions/events";
import { formatDate, formatTime, truncateText } from "@/lib/utils";
import { Event } from "@/types/event.types";

export default function JoinEventPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  // Form setup
  const form = useForm<JoinEventFormData>({
    resolver: zodResolver(joinEventSchema),
    defaultValues: { eventCode: code ?? "" },
  });

  const eventCode = form.watch("eventCode");

  // Reset events if input is cleared
  useEffect(() => {
    if (eventCode.trim() === "") {
      setEvents([]);
      setCurrent(0);
    }
  }, [eventCode]);

  // Auto-run search if ?code= is present
  useEffect(() => {
    if (code && code.trim() !== "") {
      form.setValue("eventCode", code);
      onSubmit({ eventCode: code });
    }
  }, [code, form]);

  // Main submit handler (keyword search)
  const onSubmit = async (values: JoinEventFormData) => {
    setLoading(true);

    const res = await searchEventsAction(values.eventCode.trim());

    if (res.success) {
      const mapped = res.data.map((event: Event) => ({
        id: event.id,
        eventName: event.eventName,
        organizationName: event.organizationName,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        venueLocation: event.venueLocation,
        numOfTips: event.numOfTips,
      }));

      setEvents(mapped);
    } else {
      setEvents([]);
    }

    setLoading(false);
  };

  const handleEnterEvent = (id: string) => {
    setLoadingEventId(id);
    router.push(`/room/${id}`);
  };

  const next = () => {
    if (events.length <= 1) return;
    setCurrent(i => (i === events.length - 1 ? 0 : i + 1));
  };

  const visible = events.length > 0 ? [events[current]] : [];

  const clearSearch = () => {
    form.setValue("eventCode", ""); // clears input
    setEvents([]); // optionally clear results
    setCurrent(0); // reset carousel index
  };

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center bg-cover bg-fixed bg-center bg-no-repeat"
      style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
    >
      <Link
        href="/"
        className="open_sans absolute top-4 left-4 flex items-center gap-2 rounded-full border px-4 py-2 text-sm sm:text-base"
      >
        <ArrowLeft className="size-5" />
        <span className="text-muted-foreground">Home</span>
      </Link>

      <div className="bg-secondary/10 relative mx-auto flex w-full max-w-md flex-col items-center space-y-6 rounded p-6 backdrop-blur-md">
        <h1 className="racing_sans_one text-3xl sm:text-5xl">Find Event</h1>

        <Paragraph
          align="center"
          size="sm"
          color="muted"
        >
          Search for your event or use auto detect.
        </Paragraph>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6"
          >
            <FormField
              control={form.control}
              name="eventCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search</FormLabel>
                  <FormControl>
                    <div className="flex gap-4">
                      <Input
                        placeholder="Enter keyword..."
                        autoComplete="off"
                        className="bg-white"
                        {...field}
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon"
                        className="size-12 border-gray-300"
                        disabled={loading}
                      >
                        {loading ? (
                          <LoaderCircle className="size-6 animate-spin" />
                        ) : (
                          <Search className="text-muted-foreground size-6" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {/* Results */}
        <div className="flex w-full flex-row items-center gap-4">
          <div className="flex-1">
            {visible.map((event: Event) => (
              <div
                key={event.id}
                className="relative rounded-md border bg-white p-4 shadow-sm"
              >
                <div className="absolute top-2 right-2">
                  <EventStatus
                    eventDate={event.eventDate}
                    startTime={event.startTime}
                    endTime={event.endTime}
                  />
                </div>

                <Paragraph
                  size="sm"
                  weight="bold"
                >
                  {truncateText(event.eventName)}
                </Paragraph>

                <Paragraph
                  size="xs"
                  color="muted"
                  className="-mt-2"
                >
                  Organised by {event.organizationName}
                </Paragraph>

                <Paragraph
                  size="xs"
                  color="muted"
                  className="mt-2 flex gap-1"
                >
                  <Calendar /> {formatDate(event.eventDate)} ·{" "}
                  {formatTime(event.startTime)}
                </Paragraph>

                <Paragraph
                  size="xs"
                  color="muted"
                  className="flex gap-1"
                >
                  <MapPin /> {event.venueLocation}
                </Paragraph>

                <Paragraph
                  size="xs"
                  color="muted"
                  className="flex gap-1"
                >
                  <Users /> {event.numOfTips || 0} Tips
                </Paragraph>

                <Button
                  className="w-full"
                  onClick={() => handleEnterEvent(event.id)}
                >
                  {loadingEventId === event.id ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Joining...
                    </div>
                  ) : (
                    "Join Event"
                  )}
                </Button>
              </div>
            ))}
          </div>

          {events.length > 1 && (
            <Button
              variant="outline"
              size="icon"
              className="border-muted-foreground"
              onClick={next}
              disabled={loading}
            >
              <ChevronRight className="size-6" />
            </Button>
          )}
        </div>

        {/* Join button (when no results) */}
        {events.length === 0 && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => onSubmit({ eventCode })}
            disabled={loading || eventCode.trim() === ""}
          >
            Search
          </Button>
        )}

        <div className="flex w-full items-center gap-6">
          <div className="flex-1 border-t border-gray-300" />
          <Paragraph
            size="sm"
            color="muted"
          >
            or
          </Paragraph>
          <div className="flex-1 border-t border-gray-300" />
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full border border-gray-300"
          onClick={() => setShowPrompt(true)}
          disabled={loading}
        >
          Auto detect event
        </Button>
      </div>

      <LocationPrompt
        open={showPrompt}
        onAllow={country => {
          console.log("Allowed in", country);
          setShowPrompt(false);
        }}
        onDeny={() => setShowPrompt(false)}
        onClose={() => {
          setShowPrompt(false);
          clearSearch(); // clear input when modal closed
        }}
      />
    </section>
  );
}
