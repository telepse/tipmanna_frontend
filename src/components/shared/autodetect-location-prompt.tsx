"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// Third-party imports
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  LoaderCircle,
  MapPin,
  Search,
  Users,
  House,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Local imports
import {
  getNearbyEventsAction,
  searchEventsByCodeAction,
} from "@/actions/events";
import {
  formatDate,
  formatTime,
  getEventStatus,
  getStatusColor,
  truncateText,
} from "@/lib/utils";
import {
  JoinEventFormData,
  joinEventSchema,
} from "@/schemas/join-event.schema";
import { EventStatus } from "./event-status";
import { Paragraph } from "./paragraph";
import { Event } from "@/types/event.types";

interface Props {
  open: boolean;
  onAllow: (country: string) => void;
  onDeny: () => void;
  onClose?: () => void;
}

export const AutoDetectLocationPrompt = ({ open, onDeny, onClose }: Props) => {
  const router = useRouter();
  const pathname = usePathname();

  const [step, setStep] = useState<"askAndDetect" | "showEvents">(
    "askAndDetect"
  );
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isJoinpage = pathname === "/join";

  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);

  const closeModal = () => {
    onClose?.();
    setStep("askAndDetect");
  };

  const handleDeny = () => {
    // localStorage.setItem("location_permission", "deny");
    onDeny();
    closeModal();
    // setStep("askAndDetect");
    router.push("/join");
  };

  const detectDeviceLocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const getCountryFromCoordinates = async (
    lat: number,
    lon: number
  ): Promise<string> => {
    try {
      const geoRes = await fetch(
        `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en`
      );
      const geoData = await geoRes.json();
      return geoData.features?.[0]?.properties?.country || "Unknown";
    } catch (error) {
      console.error("Error getting country from coordinates:", error);
      return "Unknown";
    }
  };

  const getCountryFromIP = async (): Promise<string> => {
    try {
      const ipRes = await fetch("https://ipapi.co/json/");
      const ipData = await ipRes.json();
      return ipData.country_name || "Unknown";
    } catch (error) {
      console.error("Error getting country from IP:", error);
      return "Unknown";
    }
  };

  const openDeviceLocationSettings = () => {
    // For mobile devices - try to open location settings
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // Mobile devices - show instructions
      alert(
        "Please enable Location Services in your device settings to continue."
      );
    } else {
      // Desktop browsers - show browser-specific instructions
      const browser = getBrowserName();
      let message = "Please enable location access in your browser settings:";

      switch (browser) {
        case "Chrome":
          message +=
            "\n• Click the lock icon in address bar\n• Set Location to 'Allow'\n• Or go to Settings > Privacy and Security > Site Settings > Location";
          break;
        case "Firefox":
          message +=
            "\n• Click the (i) icon in address bar\n• Set Permissions > Location to 'Allow'\n• Or go to Options > Privacy & Security > Permissions > Location";
          break;
        case "Safari":
          message +=
            "\n• Go to Safari > Preferences > Websites > Location\n• Allow location access for this site";
          break;
        case "Edge":
          message +=
            "\n• Click the lock icon in address bar\n• Set Location to 'Allow'\n• Or go to Settings > Site permissions > Location";
          break;
        default:
          message +=
            "\n• Check your browser settings and allow location access for this website";
      }

      alert(message);
    }
  };

  const getBrowserName = (): string => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg"))
      return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
      return "Safari";
    if (userAgent.includes("Edg")) return "Edge";
    return "Unknown";
  };

  const handleAllow = async () => {
    setLoading(true);
    localStorage.setItem("location_permission", "allow");

    try {
      // 1. Try device location first
      try {
        const coords = await detectDeviceLocation();
        const detectedCountry = await getCountryFromCoordinates(
          coords.latitude,
          coords.longitude
        );
        await handleDetectedLocation(detectedCountry);
      } catch (deviceError) {
        // 2. If device location fails (turned off or denied), guide user to enable it
        console.log("Device location failed:", deviceError);

        // Show alert with instructions to enable location
        openDeviceLocationSettings();

        // Wait a moment for user to potentially enable location, then retry
        setTimeout(async () => {
          try {
            const coords = await detectDeviceLocation();
            const detectedCountry = await getCountryFromCoordinates(
              coords.latitude,
              coords.longitude
            );
            await handleDetectedLocation(detectedCountry);
          } catch (retryError) {
            // If still failing after user guidance, fallback to IP detection
            console.log(
              "Device location still not available after guidance:",
              retryError
            );
            try {
              const ipCountry = await getCountryFromIP();
              await handleDetectedLocation(ipCountry);
            } catch (ipError) {
              console.error("IP-based detection also failed:", ipError);
              setError(
                "Unable to detect your location. Please try manual search."
              );
              setStep("showEvents");
              setLoading(false);
            }
          }
        }, 3000); // Wait 3 seconds for user to enable location
      }
    } catch (err) {
      console.error(err);
      setError("Unable to detect your location.");
      setStep("showEvents");
      setLoading(false);
    }
  };

  const handleDetectedLocation = async (detectedCountry: string) => {
    setCountry(detectedCountry);
    localStorage.setItem("country", detectedCountry);

    const { success, data, message } =
      await getNearbyEventsAction(detectedCountry);
    if (!success) setError(message || "Could not fetch nearby events.");

    setEvents((data as unknown as []) || []);
    setStep("showEvents");
    setLoading(false);
  };

  // 1. Define Event code form
  const form = useForm<JoinEventFormData>({
    resolver: zodResolver(joinEventSchema),
    defaultValues: {
      eventCode: "",
    },
  });

  // 3. Define host submit handler
  const onSubmit = async (values: JoinEventFormData) => {
    setLoading(true);

    const normalizedCode = values.eventCode.trim().toUpperCase();

    const res = await searchEventsByCodeAction(normalizedCode);

    if (res.success) {
      const mappedEvents = (res.data as unknown as []).map((event: Event) => ({
        id: event.id,
        eventName: event.eventName,
        organizationName: event.organizationName,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        venueLocation: event.venueLocation,
        numOfTips: event.numOfTips,
      }));
      setEvents(mappedEvents as unknown as []);
    } else {
      setEvents([]);
    }

    setLoading(false);
  };

  const handleEnterEvent = (eventId: string) => {
    const token = Date.now().toString();
    sessionStorage.setItem(`event-token-${eventId}`, token);

    setLoadingEventId(eventId);
    router.push(`/room/${eventId}?token=${token}`);
  };

  const [current, setCurrent] = useState(0);

  const next = () => {
    if (events.length <= 1) return; // prevent cycling if 0 or 1 event
    setCurrent(i => (i === events.length - 1 ? 0 : i + 1));
  };

  const visibleEvents = events.length > 0 ? [events[current]] : [];

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) {
          closeModal(); // Reset modal state
          router.push("/"); // Redirect to homepage
        }
      }}
    >
      <DialogContent className="max-h-[70vh] overflow-y-auto rounded-2xl bg-white p-0 sm:max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Location Permission</DialogTitle>
        </DialogHeader>

        {step === "askAndDetect" && (
          <div className="flex flex-col items-center gap-6 px-4 pt-6">
            <Link
              href="/"
              className="flex items-center gap-4"
            >
              <House />
              <h1 className="racing_sans_one text-2xl sm:text-3xl">
                <span className="text-primary">tip</span>manna
              </h1>
            </Link>

            <Paragraph
              align="center"
              size="xl"
              weight="bold"
              className="border-b border-gray-300 pb-2 !leading-normal"
            >
              tipmanna would like to use your location
            </Paragraph>

            <div
              className={`mt-2 flex flex-col items-center gap-2 ${loading ? "mb-4" : ""}`}
            >
              <div className="relative flex size-20 items-center justify-center">
                {/* Rotating border */}
                <div
                  className={`border-primary absolute inset-0 rounded-full border-4 border-r-transparent border-b-transparent p-1 ${loading ? "animate-spin" : ""} transition-all duration-500 ease-in-out`}
                ></div>

                {/* Static icon */}
                <MapPin className="text-primary z-10 size-10" />
              </div>

              <Paragraph
                align="center"
                size="lg"
                weight="bold"
                className="!leading-normal"
              >
                {/* {loading
                  ? "Checking location access..."
                  : "Detecting nearby events..."} */}
                Detecting nearby events...
              </Paragraph>
              {loading && (
                <Paragraph
                  align="center"
                  size="sm"
                  className="-mt-2"
                >
                  Please wait while we find your event.
                </Paragraph>
              )}
            </div>

            {!loading && (
              <div className="flex w-full border-t">
                <button
                  type="button"
                  onClick={() => {
                    closeModal(); // Close the modal first
                    router.push("/join"); // Then navigate to /join
                  }}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-bl-2xl border-r border-gray-200 p-4 hover:bg-gray-50"
                >
                  Search{" "}
                  <Search
                    className="size-4"
                    fontWeight={32}
                  />
                </button>
                <button
                  type="button"
                  onClick={handleAllow}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-br-2xl p-4 hover:bg-gray-50"
                >
                  Allow{" "}
                  <Check
                    className="size-4"
                    fontWeight={32}
                  />
                </button>
              </div>
            )}
          </div>
        )}

        {step === "showEvents" && (
          <div className="space-y-6 p-6">
            <div className="relative flex flex-col items-center gap-2">
              {isJoinpage ? (
                <ArrowLeft
                  className="text-muted-foreground absolute top-0 left-0 cursor-pointer"
                  onClick={() => router.push("/join")}
                />
              ) : (
                <></>
              )}

              <MapPin className="text-muted-foreground size-8" />

              {!visibleEvents && country && (
                <Paragraph
                  align="center"
                  size="lg"
                  weight="bold"
                >{`Nearby events in ${country}`}</Paragraph>
              )}

              {visibleEvents.length > 0 ? (
                <Paragraph
                  align="center"
                  size="lg"
                  weight="bold"
                >
                  Events detected
                </Paragraph>
              ) : (
                <Paragraph
                  align="center"
                  size="lg"
                  weight="bold"
                >
                  No Event detected
                </Paragraph>
              )}
            </div>

            {error ? (
              <>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="mt-6 w-full space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="eventCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Search event manually</FormLabel>
                          <FormControl>
                            <div className="flex gap-4">
                              <Input
                                placeholder="Enter event code"
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

                    <Button
                      type="submit"
                      variant="default"
                      size="icon"
                      className={`size-12 w-full border-gray-300 ${visibleEvents.length >= 1 ? "hidden" : "block"}`}
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          <span>Joining...</span>
                        </div>
                      ) : (
                        "Join Event"
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Show events */}
                <div className="mt-6 flex w-full flex-row items-center gap-4">
                  <div className="flex-1 items-center gap-4 sm:gap-6">
                    {visibleEvents.map((event: Event) => (
                      <div
                        key={event.id}
                        className="relative rounded border bg-white p-4 shadow-sm"
                      >
                        <Paragraph
                          size="sm"
                          weight="bold"
                          className="mt-2"
                        >
                          {truncateText(event.eventName)}
                        </Paragraph>
                        <Paragraph
                          size="xs"
                          color="muted"
                          className="-mt-2"
                        >
                          Organised by{" "}
                          {truncateText(event.organizationName, 10)}
                        </Paragraph>
                        <Paragraph
                          size="xs"
                          color="muted"
                          className="mt-2 flex items-center gap-1"
                        >
                          <Calendar /> {formatDate(event.eventDate)} &middot;{" "}
                          {formatTime(event.startTime)}
                        </Paragraph>
                        <Paragraph
                          size="xs"
                          color="muted"
                          className="flex items-center gap-1"
                        >
                          <MapPin /> {event.venueLocation}
                        </Paragraph>
                        <Paragraph
                          size="xs"
                          color="muted"
                          className="flex items-center gap-1"
                        >
                          <Users /> {event.numOfTips || 0} Tipped
                        </Paragraph>
                        <div className="absolute top-2 right-2">
                          <EventStatus
                            startTime={event.startTime}
                            endTime={event.endTime}
                            eventDate={event.eventDate}
                          />
                        </div>
                        <Button
                          type="button"
                          className="mt-1 w-full"
                          onClick={() => handleEnterEvent(event.id)}
                        >
                          {loadingEventId === event.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              <span>Joining...</span>
                            </div>
                          ) : (
                            "Join Event"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {events.length >= 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-muted-foreground next-event"
                      onClick={next}
                      disabled={events.length <= 1 || loading} // disable if no next item or loading
                    >
                      <ChevronRight className="size-6" />
                    </Button>
                  )}
                </div>
              </>
            ) : events.length > 0 ? (
              <div className="space-y-6">
                {events.map((event: Event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-2 rounded-xl border p-2 text-left"
                  >
                    <div className="relative">
                      <Image
                        src={event.eventBanner || "/assets/event_banner.webp"}
                        alt={event.eventName}
                        width={320}
                        height={180}
                        className="h-[180px] w-[320px] rounded-xl object-cover"
                      />
                      <span
                        className={`absolute top-4 left-4 text-sm ${getStatusColor(getEventStatus(event.eventDate, event.startTime, event.endTime))}`}
                      >
                        {getEventStatus(
                          event.eventDate,
                          event.startTime,
                          event.endTime
                        )}
                      </span>
                    </div>

                    <h5 className="font-semibold">{event.eventName}</h5>
                    <p className="text-muted-foreground -mt-2 text-sm">
                      By: {event.organizationName}
                    </p>
                    <p className="text-sm">{event.venueName}</p>

                    <div className="flex flex-wrap gap-2">
                      <p className="flex items-center gap-2">
                        <Calendar className="size-5" />
                        <span className="text-muted-foreground text-sm">
                          {formatDate(event.eventDate)}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="size-5" />
                        <span className="text-muted-foreground text-sm">
                          {formatTime(event.startTime)}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Users className="size-5" />
                        <span className="text-muted-foreground text-sm">
                          {event.numOfTips || 0} Tips
                        </span>
                      </p>
                    </div>

                    <Button
                      size="lg"
                      className="w-full"
                      disabled={loading}
                      onClick={() => handleEnterEvent(event.id)}
                    >
                      {loadingEventId === event.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          <span>Joining...</span>
                        </div>
                      ) : (
                        "Join Event"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Paragraph
                align="center"
                size="sm"
                color="muted"
              >
                No events found near your location.
              </Paragraph>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
