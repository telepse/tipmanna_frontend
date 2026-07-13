"use client";

import { useState } from "react";

// Third-party imports
import { useFormContext, Control, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Users, Music, Plus, X, Link } from "lucide-react";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { EventFormData } from "@/schemas";
import { AddItemModal } from "./add-item-modal";

interface SessionsInfoProps {
  control: Control<EventFormData>;
}

export const SessionsInfo = ({ control }: SessionsInfoProps) => {
  const {
    control: formControl,
    setValue,
    watch,
  } = useFormContext<EventFormData>();

  // Performers
  const {
    fields: performers,
    append: addPerformer,
    remove: removePerformer,
  } = useFieldArray({ control: formControl, name: "performers" });

  // Cohosts
  const {
    fields: cohosts,
    append: addCohost,
    remove: removeCohost,
  } = useFieldArray({ control: formControl, name: "cohosts" });

  // Watch sessions and performers
  const sessions = watch("sessions") || [];

  // Modal states
  const [sessionModal, setSessionModal] = useState(false);
  const [performerModal, setPerformerModal] = useState(false);

  const dividedIntoSessions =
    (watch("dividedIntoSessions" as keyof EventFormData) as boolean) || false;
  const multiAmount =
    (watch("multiAmount" as keyof EventFormData) as boolean) || false;
  const defaultAmount =
    (watch("defaultAmount" as keyof EventFormData) as number) || 0;

  const { append: addSession, remove: removeSession } = useFieldArray({
    control: formControl,
    name: "sessions",
  });

  const handleAddSession = () => {
    if (sessions.length >= 3) return;

    const sessionNumber = sessions.length + 1;
    addSession({
      title: `Session ${sessionNumber}`,
      description: "",
      startTime: "",
      endTime: "",
      amountToRaise: multiAmount ? 0 : defaultAmount,
    });
  };

  return (
    <div className="space-y-6">
      {/* 🎤 Performers */}
      <div className="space-y-6 rounded-lg border p-4 shadow sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Music /> Performers
        </h2>

        <div className="space-y-4">
          {performers.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4">
              <Music className="text-muted-foreground size-8" />
              <Paragraph
                size="sm"
                weight="medium"
                color="muted"
              >
                No performers added yet
              </Paragraph>
              <Paragraph
                size="xs"
                color="muted"
              >
                Add performers with name & email
              </Paragraph>
            </div>
          )}

          {performers.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col gap-3 sm:flex-row"
            >
              {/* Performer Name */}
              <FormField
                control={control}
                name={`performers.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex flex-1 flex-col">
                    <FormLabel className="text-sm">Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Performer name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Performer Email */}
              <FormField
                control={control}
                name={`performers.${index}.email`}
                render={({ field }) => (
                  <FormItem className="flex flex-1 flex-col">
                    <FormLabel className="text-sm">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Performer email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remove button */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-muted-foreground size-12"
                onClick={() => removePerformer(index)}
              >
                <X className="size-6" />
              </Button>
            </div>
          ))}

          {/* Add performer */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="border-input w-full"
            onClick={() => addPerformer({ name: "", email: "" })}
            disabled={performers.length >= 3}
          >
            <Plus /> Add Performer
          </Button>
        </div>
      </div>

      {/* 🕒 Sessions */}
      <div className="space-y-6 rounded-lg border p-4 shadow sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Clock /> Sessions
        </h2>

        {/* Step 1: Divided into Sessions */}
        <div className="space-y-4 rounded-lg border p-4 shadow sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock /> Is your event divided into sessions?
          </h2>
          <div className="flex gap-4">
            <Button
              variant={dividedIntoSessions ? "outline" : "default"}
              onClick={() => setValue("dividedIntoSessions", true)}
            >
              Yes
            </Button>
            <Button
              variant={!dividedIntoSessions ? "outline" : "default"}
              onClick={() => setValue("dividedIntoSessions", false)}
            >
              No
            </Button>
          </div>
        </div>

        {/* Step 2: Different amounts per session */}
        {dividedIntoSessions && (
          <div className="space-y-4 rounded-lg border p-4 shadow sm:p-6">
            <h2 className="font-semibold">
              Do your sessions have different amounts?
            </h2>
            <div className="flex gap-4">
              <Button
                variant={multiAmount ? "outline" : "default"}
                onClick={() => setValue("multiAmount", true)}
              >
                Yes
              </Button>
              <Button
                variant={!multiAmount ? "outline" : "default"}
                onClick={() => setValue("multiAmount", false)}
              >
                No
              </Button>
            </div>

            {/* Default amount */}
            <FormField
              control={control}
              name="defaultAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Amount To Be Raised</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter default amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Session-specific amounts if multiAmount */}
            {multiAmount &&
              sessions.map((s, i) => (
                <FormField
                  key={i}
                  control={control}
                  name={`sessions.${i}.amountToRaise`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{s.title} Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={`Enter amount for ${s.title}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

            {/* Sessions list */}
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <Paragraph
                  size="sm"
                  color="muted"
                >
                  No sessions added yet
                </Paragraph>
              ) : (
                <ul className="list-disc pl-4">
                  {sessions.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2"
                    >
                      <span className="font-medium">{s.title}</span>
                      {multiAmount && (
                        <span className="text-muted-foreground">
                          (${s.amountToRaise})
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-muted-foreground"
                        onClick={() => removeSession(i)}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={sessions.length >= 3}
              onClick={handleAddSession}
            >
              <Plus /> Add Session
            </Button>
          </div>
        )}
      </div>

      {/* 🧑‍🤝‍🧑 Co-Hosts */}
      <div className="space-y-6 rounded-lg border p-4 shadow sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Users /> Co-Host
        </h2>
        <p className="text-muted-foreground text-sm">
          Note that co-hosts will receive a report and have access to event room
          settings.
        </p>

        <div className="space-y-4">
          {cohosts.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4">
              <Users className="text-muted-foreground size-8" />
              <Paragraph
                size="sm"
                weight="medium"
                color="muted"
              >
                No co-hosts added yet
              </Paragraph>
            </div>
          )}

          {cohosts.map((field, index) => (
            <FormField
              key={field.id}
              control={control}
              name={`cohosts.${index}.email`}
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Co-Host email address"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="border-muted-foreground size-12"
                    onClick={() => removeCohost(index)}
                  >
                    <X className="size-6" />
                  </Button>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="border-input w-full"
            onClick={() => addCohost({ email: "" })}
            disabled={cohosts.length >= 3}
          >
            <Plus /> Add Co-Host
          </Button>
        </div>
      </div>

      <div className="space-y-6 rounded-lg border p-4 shadow sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Link /> Media & Links
        </h2>

        <FormField
          control={control}
          name="liveVideoLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Live Video Link *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Paste your YouTube link here"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 🧱 Modals */}
      <AddItemModal
        open={sessionModal}
        onOpenChange={setSessionModal}
        title="Add Session"
        fields={[
          { name: "title", label: "Session Title", required: true },
          { name: "description", label: "Description" },
          {
            name: "startTime",
            label: "Start Time",
            type: "datetime-local",
            required: true,
          },
          {
            name: "endTime",
            label: "End Time",
            type: "datetime-local",
            required: true,
          },
        ]}
        onSubmit={data => {
          setValue("sessions", [...sessions, data]);
          setSessionModal(false);
        }}
      />

      <AddItemModal
        open={performerModal}
        onOpenChange={setPerformerModal}
        title="Add Performer"
        fields={[
          { name: "name", label: "Performer Name", required: true },
          { name: "email", label: "Performer Email" },
        ]}
        onSubmit={data => {
          setValue("performers", [...performers, data]);
          setPerformerModal(false);
        }}
      />
    </div>
  );
};
