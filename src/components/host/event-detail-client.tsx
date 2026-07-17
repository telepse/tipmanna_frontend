"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

// Third-party imports
import { useSelector } from "react-redux";
import {
  Calendar,
  CirclePoundSterling,
  Clock,
  FileText,
  MapPin,
  MoveLeft,
  Music,
  PencilLine,
  UsersRound,
  Check,
  Briefcase,
  Loader2,
  Ellipsis,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Local imports
import { RootState } from "@/redux/store";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  deleteHostEventDetailsAction,
  deleteHostEventMessageAction,
  postHostEventMessageAction,
  updateHostEventDetailsAction,
} from "@/actions/host";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { useRouter } from "next/navigation";

interface TipUsageDisclosure {
  percentage: number;
  usageType: string;
}

interface Cohost {
  id: string;
  fullName: string;
  email: string;
}

interface Performer {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

interface Project {
  id: string;
  name: string;
}

interface Content {
  id: string;
  title: string;
  description: string;
  url: string;
  eventVideoType: string;
}

interface ReportRecipient {
  id: string;
  email: string;
  enabled: boolean;
}

interface Props {
  eventId: string;
  eventName: string;
  eventDescription: string;
  organizationName: string;
  hostName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  cohosts: Cohost[];
  performers: Performer[];
  projects: Project[];
  amountToRaise: number;
  venueLocation: string;
  venueName: string;
  activities: string[];
  resourcesRequested: string[];
  tipUsageDisclosure: TipUsageDisclosure[];
  contents: Content[];
  hostEmail: string;
  initialHostMessages: HostMessage[];
}

interface EventFormValues {
  eventId: string;
  eventName: string;
  eventDescription: string;
  organizationName: string;
  hostName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  cohosts: Cohost[];
  performers: Performer[];
  projects: Project[];
  amountToRaise: number;
  venueLocation: string;
  venueName: string;
  activities: string[];
  resourcesRequested: string[];
  tipUsageDisclosure: TipUsageDisclosure[];
  contents: Content[];
  eventMessage: string;
  hostEmail: string;
  reportRecipients: ReportRecipient[];
  performerReportRecipients: ReportRecipient[]; // add this
}

interface HostMessage {
  id: string;
  sender: string;
  text: string;
  senderType: "HOST";
  createdAt: string;
}

type HostUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "HOST";
  eventCode?: string;
  eventSlug?: string;
  numOfEvents?: number;
  individualLegalFirstName?: string;
  individualLegalLastName?: string;
  organizationName?: string;
};

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatEventDate = (date: Date | string) => {
  const d = new Date(date);

  const day = d.getDate();

  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  const month = d.toLocaleString("en-GB", {
    month: "long",
  });

  const year = d.getFullYear();

  return `${day}${suffix} ${month} ${year}`;
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

export const EventDetailClient = ({
  eventId,
  eventName,
  eventDescription,
  organizationName,
  hostName,
  eventType,
  eventDate,
  startTime,
  endTime,
  cohosts,
  performers,
  projects,
  amountToRaise,
  venueLocation,
  venueName,
  activities,
  resourcesRequested,
  tipUsageDisclosure,
  contents,
  hostEmail,
  initialHostMessages,
}: Props) => {
  const [tabType, setTabType] = useState<
    "event_info" | "contents" | "post_to_event" | "generate_report"
  >("event_info");

  const user = useSelector((state: RootState) => state.auth.user) as HostUser;
  const token = useSelector((state: RootState) => state.auth.token);

  const userType = (user as HostUser)?.individualLegalFirstName
    ? "INDIVIDUAL"
    : "ORGANIZATION";

  let eventSlug;
  if (user?.role === "HOST") {
    eventSlug = user?.eventSlug;
  }

  let displayText;
  if (userType === "INDIVIDUAL") {
    displayText = `You are creating as an individual - ${user?.individualLegalFirstName} ${user?.individualLegalLastName}.`;
  } else if (userType === "ORGANIZATION") {
    displayText = `You are creating as an organization - ${user?.organizationName}.`;
  }

  const form = useForm<EventFormValues>({
    defaultValues: {
      eventId,
      eventName,
      eventDescription,
      organizationName,
      hostName,
      eventType,
      eventDate,
      startTime,
      endTime,
      cohosts,
      performers,
      projects,
      amountToRaise,
      venueLocation,
      venueName,
      activities,
      resourcesRequested,
      tipUsageDisclosure,
      contents,
      eventMessage: "",
      hostEmail,
      reportRecipients: cohosts.map(cohost => ({
        id: cohost.id,
        email: cohost.email,
        enabled: true,
      })),
      performerReportRecipients: performers.map(performer => ({
        id: performer.id,
        email: performer.email ?? "",
        enabled: true,
      })),
    },
  });

  const {
    eventDate: watchedEventDate,
    startTime: watchedStartTime,
    endTime: watchedEndTime,
  } = form.watch();

  const eventMessage = form.watch("eventMessage");

  const messyEventTime = watchedEventDate + watchedEndTime;
  const messyDatePart = messyEventTime.substring(0, 10);
  const messyTimePart = messyEventTime.slice(-5);

  // Reconstruct the messy time into a valid ISO string
  const cleanISO = `${messyDatePart}T${messyTimePart}:00.000Z`;

  // Convert to a raw number
  const cleanEventTime = Date.parse(cleanISO);

  const hasEventEnded = cleanEventTime < new Date().getTime();

  const [editableFields, setEditableFields] = useState<Record<string, boolean>>(
    {}
  );

  const toggleEditable = (field: string) => {
    setEditableFields(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleEditableToggle = (field: string, onSave?: () => void) => {
    if (isEditable(field)) {
      onSave?.();

      toggleEditable(field);
      return;
    }

    toggleEditable(field);
  };

  const isEditable = (field: string) => !!editableFields[field];

  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState("15");

  const handleExtendEvent = () => {
    const currentEnd = form.getValues("endTime");

    const [hours, minutes] = currentEnd.split(":").map(Number);

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    date.setMinutes(date.getMinutes() + Number(extendMinutes));

    const newEndTime = `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    form.setValue("endTime", newEndTime);

    setExtendDialogOpen(false);
  };

  const addReportEmail = () => {
    const current = form.getValues("reportRecipients");

    form.setValue("reportRecipients", [
      ...current,
      {
        id: crypto.randomUUID(),
        email: "",
        enabled: true,
      },
    ]);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isPostingMessage, setIsPostingMessage] = useState(false);

  const [hostMessages, setHostMessages] =
    useState<HostMessage[]>(initialHostMessages);

  const handleSaveChanges = async () => {
    setIsSaving(true);

    try {
      const values = form.getValues();

      await updateHostEventDetailsAction({
        hostId: user.id,
        eventId,
        token,
        payload: {
          eventDate: values.eventDate,
          startTime: values.startTime,
          endTime: values.endTime,

          cohosts: values.cohosts.map(cohost => ({
            id: cohost.id,
            email: cohost.email,
          })),

          performers: values.performers.map(performer => ({
            id: performer.id,
            name: performer.name,
            email: performer.email,
            role: performer.role,
          })),

          projects: values.projects.map(project => ({
            id: project.id,
            name: project.name,
          })),

          contents: values.contents.map(content => ({
            id: content.id,
            title: content.title,
            description: content.description,
          })),
        },
      });

      toast.success("Event updated successfully");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error ? error.message : "Failed to update event"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostMessage = async () => {
    const message = form.getValues("eventMessage").trim();

    if (!message) {
      return toast.error("Please enter a message.");
    }

    setIsPostingMessage(true);

    try {
      const createdMessage = await postHostEventMessageAction({
        hostId: user.id,
        eventId,
        token,
        payload: {
          text: message,
        },
      });

      setHostMessages(prev => [createdMessage.data as HostMessage, ...prev]);

      toast.success("Message sent.");

      // Clear textarea
      form.setValue("eventMessage", "");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error ? error.message : "Failed to send message."
      );
    } finally {
      setIsPostingMessage(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;

    const channelName = `event-${eventId}`;

    const channel = subscribeChannel(channelName);

    if (!channel) return;

    const handleHostMessage = (message: HostMessage) => {
      setHostMessages(prev => {
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }

        return [message, ...prev];
      });
    };

    const handleDeletedMessage = ({ id }: { id: string }) => {
      setHostMessages(prev => prev.filter(message => message.id !== id));
    };

    channel.bind("host-message-deleted", handleDeletedMessage);
    channel.bind("host-message", handleHostMessage);

    return () => {
      channel.unbind("host-message", handleHostMessage);
      channel.unbind("host-message-deleted", handleDeletedMessage);
      unsubscribeChannel(channelName);
    };
  }, [eventId]);

  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null
  );

  const handleDeleteMessage = async (messageId: string) => {
    try {
      setDeletingMessageId(messageId);

      await deleteHostEventMessageAction({
        hostId: user.id,
        eventId,
        messageId,
        token,
      });

      // Optimistic removal
      setHostMessages(prev => prev.filter(message => message.id !== messageId));

      toast.success("Message deleted.");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error ? error.message : "Failed to delete message."
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  // const [isDeleting, setIsDeleting] = useState(false);
  // const router = useRouter();

  // const handleDeleteEvent = async () => {
  //   try {
  //     setIsDeleting(true);

  //     await deleteHostEventDetailsAction({
  //       hostId: user.id,
  //       eventId,
  //       token,
  //     });

  //     toast.success("Event deleted.");

  //   } catch (error) {
  //     console.error(error);

  //     toast.error(
  //       error instanceof Error
  //         ? error.message
  //         : "Failed to delete event."
  //     );
  //   } finally {
  //     setIsDeleting(false);
  //   }
  // };

  return (
    <Form {...form}>
      <section className="flex flex-col gap-6">
        <div className="flex justify-between">
          <Link
            href={`/host/${eventSlug}/manage-event`}
            className="flex w-fit items-center gap-2 text-xl font-bold"
          >
            <MoveLeft /> {eventName}
          </Link>

          <div className="flex gap-4">
            <Button
              variant="default"
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {}}
            >
              Delete Event
            </Button>
            {/* <Button variant="destructive" onClick={handleDeleteEvent} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete Event"}
            </Button> */}
          </div>
        </div>

        <Tabs
          value={tabType}
          onValueChange={val =>
            setTabType(
              val as
                | "event_info"
                | "contents"
                | "post_to_event"
                | "generate_report"
            )
          }
          className="section -mt-6 space-y-4 px-0"
        >
          <TabsList className="flex h-14! w-full gap-1">
            <TabsTrigger
              value="event_info"
              className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
            >
              Event info
            </TabsTrigger>
            <TabsTrigger
              value="contents"
              className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
            >
              Contents
            </TabsTrigger>
            <TabsTrigger
              value="post_to_event"
              className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
            >
              Post to event
            </TabsTrigger>
            <TabsTrigger
              value="generate_report"
              className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
            >
              Generate report
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="event_info"
            className="space-y-4"
          >
            <p className="text-muted-foreground text-sm">{displayText}</p>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-full space-y-6 lg:col-span-7">
                <div className="bg-card space-y-4 rounded-md border p-6">
                  <h5 className="flex items-center gap-2 text-xl font-bold">
                    <FileText /> Basic Event Information
                  </h5>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="eventName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Event Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="bg-gray-100"
                              disabled
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Event Organizer
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="bg-gray-100"
                              disabled
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="hostName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Host Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="bg-gray-100"
                              disabled
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Event Type
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="bg-gray-100"
                              disabled
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="eventDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Event Description
                        </FormLabel>

                        <FormControl>
                          <Textarea
                            className="min-h-16 resize-none bg-gray-100"
                            disabled
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-card space-y-4 rounded-md border p-6">
                  <div className="flex items-center justify-between">
                    <h5 className="flex items-center gap-2 text-xl font-bold">
                      <Calendar /> Event Timing
                    </h5>

                    <button
                      type="button"
                      onClick={() =>
                        handleEditableToggle("eventTiming", () => {
                          console.log(form.getValues());
                        })
                      }
                      className="cursor-pointer"
                    >
                      {isEditable("eventTiming") ? <Check /> : <PencilLine />}
                    </button>
                  </div>

                  {isEditable("eventTiming") ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="eventDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">
                              Event Date
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                value={
                                  field.value
                                    ? new Date(field.value)
                                        .toISOString()
                                        .split("T")[0]
                                    : ""
                                }
                                onChange={e => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">
                              Start Time
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">
                              End Time
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          disabled
                          className="bg-gray-100"
                          value={`${formatEventDate(watchedEventDate)}, ${formatTime(
                            watchedStartTime
                          )} - ${formatTime(watchedEndTime)}`}
                        />
                      </FormControl>
                    </FormItem>
                  )}

                  <div className="bg-secondary/30 flex items-center justify-between rounded-md border p-4">
                    <div className="flex items-center gap-4">
                      <Clock className="text-primary" />

                      <div className="space-y-1">
                        <h5 className="text-lg font-semibold">
                          Extend Duration
                        </h5>
                        <p className="text-sm">Add more time to event</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (hasEventEnded) {
                          return toast.error(
                            "You cannot extend the event duration after it has ended."
                          );
                        }

                        setExtendDialogOpen(true);
                      }}
                      className="cursor-pointer"
                    >
                      <PencilLine />
                    </button>
                  </div>
                </div>

                {cohosts.length > 0 && (
                  <div className="bg-card space-y-4 rounded-md border p-6">
                    <div className="flex items-center justify-between">
                      <h5 className="flex items-center gap-2 text-xl font-bold">
                        <UsersRound /> Co-Host
                      </h5>

                      <button
                        type="button"
                        onClick={() =>
                          handleEditableToggle("cohosts", () => {
                            const updatedCohosts = form.getValues("cohosts");

                            console.log("Saved cohosts:", updatedCohosts);
                          })
                        }
                        className="cursor-pointer"
                      >
                        {isEditable("cohosts") ? <Check /> : <PencilLine />}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {cohosts.map((cohost, index) => (
                        <FormField
                          key={cohost.id}
                          control={form.control}
                          name={`cohosts.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditable("cohosts")}
                                  className={
                                    !isEditable("cohosts") ? "bg-gray-100" : ""
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {performers.length > 0 && (
                  <div className="bg-card space-y-4 rounded-md border p-6">
                    <div className="flex items-center justify-between">
                      <h5 className="flex items-center gap-2 text-xl font-bold">
                        <Music /> Performer
                      </h5>

                      <button
                        type="button"
                        onClick={() =>
                          handleEditableToggle("performers", () => {
                            const updatedPerformers =
                              form.getValues("performers");

                            console.log("Saved performers:", updatedPerformers);
                          })
                        }
                        className="cursor-pointer"
                      >
                        {isEditable("performers") ? <Check /> : <PencilLine />}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {performers.map((performer, index) => (
                        <div
                          key={performer.id}
                          className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2"
                        >
                          <FormField
                            control={form.control}
                            name={`performers.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Performer Name</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={!isEditable("performers")}
                                    className={
                                      !isEditable("performers")
                                        ? "bg-gray-100"
                                        : ""
                                    }
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`performers.${index}.role`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={!isEditable("performers")}
                                    className={
                                      !isEditable("performers")
                                        ? "bg-gray-100"
                                        : ""
                                    }
                                    placeholder="e.g. Singer, DJ, Speaker"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`performers.${index}.email`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="email"
                                    disabled={!isEditable("performers")}
                                    className={
                                      !isEditable("performers")
                                        ? "bg-gray-100"
                                        : ""
                                    }
                                    placeholder="performer@email.com"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projects.length > 0 && (
                  <div className="bg-card space-y-4 rounded-md border p-6">
                    <div className="flex items-center justify-between">
                      <h5 className="flex items-center gap-2 text-xl font-bold">
                        <Briefcase /> Project
                      </h5>

                      <button
                        type="button"
                        onClick={() =>
                          handleEditableToggle("projects", () => {
                            const updatedProjects = form.getValues("projects");

                            console.log("Saved projects:", updatedProjects);
                          })
                        }
                        className="cursor-pointer"
                      >
                        {isEditable("projects") ? <Check /> : <PencilLine />}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {projects.map((project, index) => (
                        <FormField
                          key={project.id}
                          control={form.control}
                          name={`projects.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditable("projects")}
                                  className={
                                    !isEditable("projects") ? "bg-gray-100" : ""
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-card space-y-4 rounded-md border p-6">
                  <h5 className="flex items-center gap-2 text-xl font-bold">
                    <CirclePoundSterling /> Financial Details
                  </h5>

                  <FormField
                    control={form.control}
                    name="amountToRaise"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Amount to raise
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="bg-gray-100"
                            disabled
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="col-span-full space-y-6 lg:col-span-5">
                <div className="bg-card space-y-4 rounded-md border p-6">
                  <h5 className="flex items-center gap-2 text-xl font-bold">
                    <MapPin /> Venue
                  </h5>

                  <FormField
                    control={form.control}
                    name="venueLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Event Venue Location
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="bg-gray-100"
                            disabled
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="venueName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Venue Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="bg-gray-100"
                            disabled
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-card space-y-4 rounded-md border p-6">
                  <h5 className="text-xl font-bold">
                    Event Activity (Select all that apply)
                  </h5>

                  <div className="space-y-2">
                    {activities.map(activity => (
                      <div
                        key={activity}
                        className="flex items-center gap-2"
                      >
                        <Checkbox checked />
                        <label className="text-sm font-medium">
                          {activity.charAt(0) + activity.slice(1).toLowerCase()}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {resourcesRequested.length > 0 && (
                  <div className="bg-card space-y-4 rounded-md border p-6">
                    <h5 className="text-xl font-bold">
                      Resources Request (From Tipmanna)
                    </h5>

                    <div className="space-y-2">
                      {resourcesRequested.map(resource => (
                        <div
                          key={resource}
                          className="flex items-center gap-2"
                        >
                          <Checkbox checked />
                          <label className="text-sm font-medium">
                            {resource.charAt(0) +
                              resource.slice(1).toLowerCase()}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-card space-y-4 rounded-md border p-6">
                  <h5 className="text-xl font-bold">Tips Usage Disclosure</h5>

                  <div className="space-y-2">
                    {tipUsageDisclosure.map((item, index) => (
                      <div
                        key={`${item.usageType}-${index}`}
                        className="flex items-center gap-2"
                      >
                        <Checkbox checked />

                        <p className="flex gap-2 text-sm">
                          <span className="font-semibold">
                            {item.percentage}%
                          </span>{" "}
                          <span>{toTitleCase(item.usageType)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contents">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {contents.map((content: Content) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between rounded-md border bg-white p-4"
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src={(() => {
                        const videoId = extractYoutubeID(content.url);
                        return videoId
                          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                          : "/default-event-image.jpg";
                      })()}
                      alt={eventName}
                      className="h-14 w-28 object-cover"
                      width={100}
                      height={100}
                    />

                    <div className="flex-1 space-y-2">
                      <FormField
                        control={form.control}
                        name={`contents.${contents.findIndex(
                          item => item.id === content.id
                        )}.title`}
                        render={({ field }) => (
                          <FormItem>
                            {isEditable(`content-${content.id}`) ? (
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-8 text-xl font-semibold"
                                />
                              </FormControl>
                            ) : (
                              <h5 className="text-xl font-semibold">
                                {field.value}
                              </h5>
                            )}
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`contents.${contents.findIndex(
                          item => item.id === content.id
                        )}.description`}
                        render={({ field }) => (
                          <FormItem>
                            {isEditable(`content-${content.id}`) ? (
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-8 text-sm"
                                />
                              </FormControl>
                            ) : (
                              <p className="text-sm">{field.value}</p>
                            )}
                          </FormItem>
                        )}
                      />

                      <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span className="bg-primary size-2 rounded-full"></span>{" "}
                        {content.eventVideoType.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() =>
                      handleEditableToggle(`content-${content.id}`, () => {
                        console.log(form.getValues("contents"));
                      })
                    }
                    className="bg-secondary/20 hover:bg-secondary/40 text-black"
                  >
                    {isEditable(`content-${content.id}`) ? (
                      <Check />
                    ) : (
                      <PencilLine />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="post_to_event">
            <div className="bg-card space-y-4 border p-6">
              <h5 className="text-xl font-bold">Post message to Event Room</h5>

              <FormField
                control={form.control}
                name="eventMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      Send Message
                    </FormLabel>

                    <FormControl>
                      <Textarea
                        placeholder="Send a message to attendees..."
                        className="min-h-32 resize-none bg-gray-100"
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handlePostMessage}
                  disabled={isPostingMessage || !eventMessage.trim()}
                >
                  {isPostingMessage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </div>
            </div>

            {hostMessages.length > 0 && (
              <div className="bg-card space-y-4 border p-6">
                <h5 className="font-semibold">Messages</h5>

                {hostMessages.map(message => (
                  <div
                    key={message.id}
                    className="bg-secondary/30 flex items-center justify-between rounded-md p-4"
                  >
                    <p>{message.text}</p>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="cursor-pointer"
                        >
                          <Ellipsis />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={deletingMessageId === message.id}
                        >
                          Delete Message
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="generate_report">
            <div className="bg-card space-y-6 rounded-md border p-6">
              <div className="space-y-1">
                <h5 className="text-xl font-semibold">Generate report</h5>
                <p className="text-sm">Available from </p>
              </div>

              <div className="space-y-2">
                <h5 className="text-xl font-semibold">Host</h5>

                <FormField
                  control={form.control}
                  name="hostEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="bg-gray-100"
                          disabled
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("reportRecipients").length > 0 && (
                <div className="space-y-4">
                  <h5 className="text-xl font-semibold">Co-Host</h5>

                  {form.watch("reportRecipients").map((recipient, index) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between gap-4 rounded-md p-4"
                    >
                      <FormField
                        control={form.control}
                        name={`reportRecipients.${index}.email`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Email Address</FormLabel>

                            <FormControl>
                              <Input
                                {...field}
                                disabled
                                className="bg-gray-100"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`reportRecipients.${index}.enabled`}
                        render={({ field }) => (
                          <FormItem className="">
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}

              {performers.length > 0 && (
                <div className="space-y-4">
                  <h5 className="text-xl font-semibold">Performers</h5>

                  {form
                    .watch("performerReportRecipients")
                    .map((recipient, index) => {
                      const performer = performers.find(
                        performer => performer.id === recipient.id
                      );

                      return (
                        <div
                          key={recipient.id}
                          className="flex items-center justify-between gap-4 rounded-md p-4"
                        >
                          <div className="flex-1 space-y-2">
                            <h5 className="font-semibold">{performer?.name}</h5>

                            <FormField
                              control={form.control}
                              name={`performerReportRecipients.${index}.email`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email Address</FormLabel>

                                  <FormControl>
                                    <Input
                                      {...field}
                                      disabled
                                      className="bg-gray-100"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`performerReportRecipients.${index}.enabled`}
                            render={({ field }) => (
                              <FormItem>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormItem>
                            )}
                          />
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    console.log(
                      "Sending report to host:",
                      form.getValues("hostEmail")
                    );
                    console.log(
                      "Sending report to co-hosts:",
                      form.getValues("reportRecipients")
                    );
                    console.log(
                      "Sending report:",
                      form.getValues("performerReportRecipients")
                    );
                  }}
                >
                  Send Report
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <Dialog
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="">
            <DialogTitle className="text-xl font-bold">
              Extend Event
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to extend this event? This will keep the
              event room open and visible to attendees for longer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <FormLabel className="font-semibold">Extend by:</FormLabel>

            <Select
              value={extendMinutes}
              onValueChange={setExtendMinutes}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button onClick={handleExtendEvent}>Extend Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
};
