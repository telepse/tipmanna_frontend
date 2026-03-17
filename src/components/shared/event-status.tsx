"use client";

import { useEffect, useState } from "react";

interface Props {
  eventDate: string;
  startTime: string;
  endTime: string;
}

type CountdownState =
  | {
      status: "future";
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    }
  | { status: "not_started" }
  | { status: "running"; hours: number; minutes: number; seconds: number }
  | { status: "completed" };

export const EventStatus = ({ eventDate, startTime, endTime }: Props) => {
  const [state, setState] = useState<CountdownState>({ status: "not_started" });

  useEffect(() => {
    const getDateTime = (date: string, time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      const dt = new Date(date);
      dt.setHours(hours, minutes, 0, 0);
      return dt;
    };

    const start = getDateTime(eventDate, startTime);
    const end = getDateTime(eventDate, endTime);
    if (end < start) end.setDate(end.getDate() + 1);

    const updateCountdown = () => {
      const now = new Date();
      const today = new Date();
      const isToday = today.toDateString() === start.toDateString();

      // ⏳ Event is in the future (not today)
      if (!isToday && now < start) {
        const diff = start.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setState({ status: "future", days, hours, minutes, seconds });
        return;
      }

      // 🚫 Not started yet (today)
      if (now < start) {
        setState({ status: "not_started" });
      }
      // 🟢 Active
      else if (now >= start && now <= end) {
        const diff = end.getTime() - now.getTime();
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setState({ status: "running", hours, minutes, seconds });
      }
      // 🔴 Completed
      else {
        setState({ status: "completed" });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [eventDate, startTime, endTime]);

  return (
    <p className="text-[12px] font-medium">
      {state.status === "future" && (
        <span className="bg-gray rounded-md px-2 py-1 text-black">
          Not started
        </span>
      )}

      {state.status === "not_started" && (
        <span className="bg-gray rounded-md px-2 py-1 text-black">
          Not started
        </span>
      )}

      {state.status === "running" && (
        <span className="bg-moonstone-blue rounded-md px-2 py-1">Ongoing</span>
      )}

      {state.status === "completed" && (
        <span className="rounded-md bg-black px-2 py-1 text-white">
          Completed
        </span>
      )}
    </p>
  );
};
