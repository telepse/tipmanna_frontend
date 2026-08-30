"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Third-party imports
import { Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

// Local imports
import { formatDate } from "@/lib/formatDate";
import { truncateText } from "@/lib/utils";
import { ScreenDisplay } from "@/components/events/screen-display";
import { EventScreenSettings } from "@/components/events/event-screen-settings";
import { changeEventScreenSettings } from "@/actions/events";
import { getEventSessionsAction } from "@/actions/community-host-dashboard";
import { useHostSession } from "@/hooks/use-host-session";
import { useRouter } from "next/navigation";
import { TipUsageDisclosure } from "@/types/tipusagedisclosure.types";

interface Performer {
  name: string;
  description: string;
  id: string;
}

interface Project {
  name: string;
  description: string;
  id: string;
}

interface Session {
  id: string;
  title: string;
  amountToRaise: number;
  isActive: boolean;
}

interface Props {
  id: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  performers: Performer[];
  projects: Project[];
  approved: boolean;
  amountRaised: number;
  numOfTips: number;
  hostName: string;
  amountToRaise: number;
  eventBackground: string;
  showLatestAmount: boolean;
  hideProgressBarAmount: boolean;
  tipUsageDisclosure: TipUsageDisclosure[];
  latestTipAmount: number;
  moneyFor: string;
}

export function VenueEventCard({
  id,
  eventName,
  eventDate,
  startTime,
  endTime,
  performers,
  projects,
  amountRaised,
  numOfTips,
  hostName,
  amountToRaise,
  eventBackground,
  showLatestAmount,
  hideProgressBarAmount,
  tipUsageDisclosure,
  latestTipAmount,
  moneyFor,
}: Props) {
  const hostSession = useHostSession();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await getEventSessionsAction(id);
      if (!res.success || !res.data) return;
      const data = res.data as { data?: Session[] } | Session[];
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setSessions(list);
      setActiveSession(list.find((s: Session) => s.isActive) ?? null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const eventCode = hostSession?.eventCode;
  const eventSlug = hostSession?.eventSlug;

  const progress = Math.min((amountRaised / amountToRaise) * 100, 100);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLatest, setShowLatest] = useState(false);
  const [hideProgressAmount, setHideProgressAmount] = useState(false);
  const [loading, setLoading] = useState(false);

  const DEFAULT_BG = "/default.png";

  const router = useRouter();

  const textColor =
    eventBackground && eventBackground !== DEFAULT_BG
      ? "text-black"
      : "text-white";

  // 2. Define screen settings submit handler;
  // Update the screen settings submit handler
  const handleSaveSettings = async (values: {
    background: string;
    moneyFor: string;
    showLatest: boolean;
    hideProgressAmount: boolean;
    tipUsageDisclosure: Array<{
      id?: string;
      usageType: "PERFORMER_WELFARE" | "HOST_WELFARE" | "COHOST_WELFARE";
      percentage: number;
      customLabel?: string | null;
    }>;
    performers: { id?: string; name: string; description?: string }[];
    projects: { id?: string; name: string; description?: string }[];
  }) => {
    try {
      setLoading(true);

      const result = await changeEventScreenSettings(
        {
          eventBackground: values.background,
          showLatestAmount: values.showLatest,
          hideProgressBarAmount: values.hideProgressAmount,
          moneyFor: values.moneyFor,
          tipUsageDisclosure: values.tipUsageDisclosure,
          performers: values.performers,
          projects: values.projects,
        },
        id
      );

      console.log(result);

      if (result.success) {
        toast.success("Event screen settings changed");

        // Update local state with new values
        setShowLatest(values.showLatest);
        setHideProgressAmount(values.hideProgressAmount);

        // Refresh the page to get updated data
        router.refresh();
      } else {
        toast.error(result.message || "Failed to save settings");
      }
    } catch (error) {
      console.log(error);
      toast.error("An error occurred while saving settings");
    } finally {
      setLoading(false);
      setSettingsOpen(false);
    }
  };

  return (
    <div className="bg-card flex flex-col gap-4 rounded-md border p-4 md:flex-row md:items-center md:justify-between md:p-6">
      {/* Remove the flex-col sm:flex-row wrapper and make the preview container full width */}
      <div className="w-full space-y-4 md:flex md:items-center md:gap-4 md:space-y-0">
        {/* Screen Display - Full width on mobile */}
        <div className="w-full md:w-auto md:flex-shrink-0">
          <ScreenDisplay
            eventId={id}
            eventName={eventName}
            amountToRaise={amountToRaise}
            amountRaised={amountRaised}
            eventCode={eventCode!}
            eventSlug={eventSlug!}
            backgroundUrl={eventBackground}
            showLatestAmount={showLatestAmount}
            hideProgressBarAmount={hideProgressBarAmount}
            latestTipAmount={latestTipAmount}
            tipUsageDisclosure={tipUsageDisclosure}
          >
            <div
              className="flex h-[180px] w-full flex-col items-center justify-center gap-1 bg-cover bg-center bg-no-repeat p-4 sm:h-28 md:w-48"
              style={{
                backgroundImage: `url(${eventBackground || "/default.png"})`,
              }}
            >
              <h6
                className={`text-center text-[12px] font-semibold ${textColor} md:text-[10px]`}
              >
                {showLatestAmount
                  ? "Latest amount sent"
                  : "Together you've sent"}
              </h6>

              <h4 className={`font-semibold ${textColor}`}>
                &pound;
                {showLatestAmount
                  ? latestTipAmount
                  : amountRaised.toLocaleString()}
              </h4>

              <p
                className={`text-[10px] font-semibold ${textColor} md:text-[12px]`}
              >
                tipmanna.com
              </p>

              {/* Only show progress bar on md screens and up */}
              <div className="hidden w-full max-w-xl items-center gap-2 md:flex">
                {/* Progress Bar */}
                <div className="flex-1">
                  <div className="relative h-1 overflow-hidden rounded-md bg-black">
                    <div
                      className="from-primary to-secondary absolute top-0 left-0 h-full bg-gradient-to-r"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className={`text-[8px] font-semibold ${textColor}`}>
                    &pound;{amountRaised}
                  </p>
                </div>

                {/* Target Icon */}
                <div>
                  <Image
                    src="/icons/diamond.png"
                    alt="Diamond"
                    width={40}
                    height={40}
                    className="-mt-3 size-2"
                  />
                  <p className={`text-[8px] font-semibold ${textColor}`}>
                    &pound;{amountToRaise}
                  </p>
                </div>
              </div>
            </div>
          </ScreenDisplay>
        </div>

        {/* Event details - Full width on mobile */}
        <div className="w-full space-y-1 md:flex-1">
          <h5 className="font-semibold">{truncateText(eventName, 40)}</h5>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            {formatDate(eventDate)} <Clock className="size-4" /> {startTime} -{" "}
            {endTime} &middot; Performers:{" "}
          </p>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="text-primary">Tips raised:</span>{" "}
            <span className="text-primary font-semibold">
              &pound;{amountRaised || 0}
            </span>{" "}
            <span>Event code: {eventCode}</span> &middot;
            <span>{numOfTips} tips</span>
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => setSettingsOpen(true)}
        className="mt-4 w-full border border-black md:mt-0 md:w-auto"
      >
        <Settings /> Settings
      </Button>

      <EventScreenSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialBackground={eventBackground}
        initialMoneyFor={moneyFor}
        initialShowLatest={showLatestAmount}
        initialHideProgressAmount={hideProgressBarAmount}
        loading={loading}
        tipUsageDisclosure={tipUsageDisclosure as TipUsageDisclosure[]}
        eventId={id}
        initialPerformers={performers}
        initialProjects={projects}
        sessions={sessions}
        activeSession={activeSession}
        refetchSessions={fetchSessions}
      />
    </div>
  );
}
