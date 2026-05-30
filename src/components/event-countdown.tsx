"use client";

import { useEffect, useState } from "react";

interface Props {
  eventDate: string;
  startTime: string;
  endTime: string;
}

type CountdownState =
  | { status: "running"; hours: number; minutes: number; seconds: number }
  | {
      status: "not_started" | "completed";
      durationHours: number;
      durationMinutes: number;
    };

export const EventCountdown = ({ eventDate, startTime, endTime }: Props) => {
  const [state, setState] = useState<CountdownState>({
    status: "not_started",
    durationHours: 0,
    durationMinutes: 0,
  });

  // Calculate total event duration
  const getDuration = () => {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    if (end < start) end.setDate(end.getDate() + 1);
    const diff = end.getTime() - start.getTime();
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
    };
  };

  const { hours: totalHours, minutes: totalMinutes } = getDuration();

  useEffect(() => {
    const parseDateTime = (date: string, time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      const dt = new Date(date);
      dt.setHours(hours, minutes, 0, 0);
      return dt;
    };

    const start = parseDateTime(eventDate, startTime);
    const end = parseDateTime(eventDate, endTime);
    if (end < start) end.setDate(end.getDate() + 1);

    const update = () => {
      const now = new Date();

      // Event not started yet or completed → show duration
      if (now < start || now > end) {
        setState({
          status: now < start ? "not_started" : "completed",
          durationHours: totalHours,
          durationMinutes: totalMinutes,
        });
      }
      // Event is ongoing → show countdown
      else {
        const diff = end.getTime() - now.getTime();
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        setState({ status: "running", hours, minutes, seconds });
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [eventDate, startTime, endTime, totalHours, totalMinutes]);

  return (
    <p className="text-xs font-medium sm:text-sm">
      {state.status === "running" ? (
        <>
          <span>Ends in:</span> {state.hours > 0 && `${state.hours}h `}
          {state.minutes}m {state.seconds}s
        </>
      ) : (
        <>
          <span>
            {state.status === "not_started" ? "Not started:" : "Completed:"}
          </span>{" "}
          {state.durationHours}h {state.durationMinutes}m
        </>
      )}
    </p>
  );
};
