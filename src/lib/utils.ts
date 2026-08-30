import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Local imports
import { Event, Transaction } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTipperUsername(email: string) {
  return email.split("@")?.[0];
}

export function formatDate(isoString: string): string {
  if (!isoString) return "";

  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    console.warn("Invalid date passed to formatDate:", isoString);
    return "";
  }

  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    date
  );
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

/**
 * Format time with AM/PM suffix.
 * @example "09:30" -> "09:30 AM"
 * @example "15:45" -> "03:45 PM"
 */
export function formatTime(time: string): string {
  if (!time) return "";

  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(minute)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  if (hour === 0)
    hour = 12; // 00:00 -> 12 AM
  else if (hour > 12) hour -= 12; // 13:00 -> 1 PM

  return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

export function newFormatTime(time: number): string {
  if (!isFinite(time)) return "00:00";

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);

// ------- Get event duration -------- //
export const getEventDuration = (
  startTime: string,
  endTime: string
): string => {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  let durationMinutes = endTotalMinutes - startTotalMinutes;

  // Handle overnight events (if end time is earlier than start time)
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60; // Add 24 hours
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  // Format the duration display in a more readable way
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}min`;
  } else {
    return "0 hours";
  }
};

// ------- Get event status -------- //
export const getEventStatus = (
  eventDate: string,
  startTime: string,
  endTime: string
): "Completed" | "Ongoing" | "Not started" => {
  if (!startTime || !endTime) {
    return "Not started"; // default if times are missing
  }

  const now = new Date();
  const eventDateTime = new Date(eventDate);

  // Combine event date with start and end times
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const startDateTime = new Date(eventDateTime);
  startDateTime.setHours(startHours, startMinutes, 0, 0);

  const endDateTime = new Date(eventDateTime);
  endDateTime.setHours(endHours, endMinutes, 0, 0);

  // Handle overnight events (if end time is earlier than start time, assume it ends next day)
  if (endDateTime < startDateTime) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  if (now > endDateTime) {
    return "Completed";
  } else if (now >= startDateTime && now <= endDateTime) {
    return "Ongoing";
  } else if (now < startDateTime) {
    // Check if event is within the next 24 hours for "Not started", otherwise "Pending"
    const timeUntilStart = startDateTime.getTime() - now.getTime();
    const hoursUntilStart = timeUntilStart / (1000 * 60 * 60);

    if (hoursUntilStart <= 24) {
      return "Completed";
    } else {
      return "Not started";
    }
  }

  return "Not started";
};

// ------- Get status color -------- //
export type EventStatus = "Completed" | "Ongoing" | "Not started" | "Upcoming";

export const getStatusColor = (status: EventStatus | string) => {
  switch (status) {
    case "Completed":
      return "text-white bg-black px-2 py-1 rounded-md text-[10px] w-fit";
    case "Ongoing":
      return "text-black bg-moonstone-blue px-2 py-1 rounded-md text-[10px] w-fit";
    case "Not started":
      return "text-black bg-gray px-2 py-1 rounded-md text-[10px] w-fit";
    default:
      return "text-gray-600 bg-gray-100 px-2 py-1 rounded-md text-[10px] w-fit";
  }
};

// ------- Truncate text -------- //
export function truncateText(text: string, limit = 20) {
  if (typeof text !== "string") return "";
  return text.length > limit ? text.slice(0, limit) + "..." : text;
}

// ------- Format UTC time -------- //
export function formatUtcTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;

  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

// -------- Format event message date ------- //
export function formatEventMessageDate(date: Date | string) {
  const dateObj = new Date(date);

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })
    .format(dateObj)
    .replace(/am|pm/i, match => match.toUpperCase());

  return formattedDate;
}

// ------- Get event stats -------- //
export { getHostEventStats as getEventStats } from "@/lib/host-event-stats";

// ------- Calculate earnings -------- //
export function calculateEarnings(data: Transaction[]) {
  const rows = Array.isArray(data) ? data : [];
  const now = new Date();

  // Helper: get month and year key like "2025-10"
  const getMonthKey = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth() + 1}`;

  // Group transactions by month
  const monthlyTotals = rows.reduce<Record<string, number>>((acc, tx) => {
    const txDate = new Date(tx.purchaseTime);
    const key = getMonthKey(txDate);
    acc[key] = (acc[key] || 0) + tx.amount;
    return acc;
  }, {});

  // Current and last month keys
  const currentMonthKey = getMonthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonthDate);

  const totalEarnings = rows.reduce((sum, tx) => sum + tx.amount, 0);
  const thisMonthEarnings = monthlyTotals[currentMonthKey] ?? 0;
  const lastMonthEarnings = monthlyTotals[lastMonthKey] ?? 0;

  // Calculate percent change
  let percentChangeFromLastMonth = 0;
  if (lastMonthEarnings > 0) {
    percentChangeFromLastMonth =
      ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100;
  } else if (thisMonthEarnings > 0) {
    // If last month had no earnings but this month does
    percentChangeFromLastMonth = 100;
  }

  // Last payment (most recent transaction)
  const lastPayment = rows
    .slice()
    .sort(
      (a, b) =>
        new Date(b.purchaseTime).getTime() - new Date(a.purchaseTime).getTime()
    )?.[0];

  return {
    totalEarnings,
    thisMonthEarnings,
    lastMonthEarnings,
    percentChangeFromLastMonth,
    lastPayment,
  };
}

// ------- to sentence case -------- //
export function toSentenceCase(str: string) {
  return str
    .toLowerCase()
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1, 20))
    .join(" ");
}

// ------- Get time difference -------- //
export function getTimeDifference(
  future: Date | string,
  now: Date | string = new Date()
) {
  const futureDate = typeof future === "string" ? new Date(future) : future;
  const nowDate = typeof now === "string" ? new Date(now) : now;

  if (isNaN(futureDate.getTime()) || isNaN(nowDate.getTime())) {
    throw new Error("Invalid date supplied to getTimeDifference()");
  }

  let diffMs = futureDate.getTime() - nowDate.getTime();

  if (diffMs < 0) diffMs = 0; // prevent negative values

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  diffMs -= days * (1000 * 60 * 60 * 24);

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  diffMs -= hours * (1000 * 60 * 60);

  const minutes = Math.floor(diffMs / (1000 * 60));

  return { days, hours, minutes };
}

// Combine date and time
export function combineDateAndTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export const PROGRAM_DISPLAY_TIMEZONE = "Europe/London";

export function formatDateUK(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;

  return d.toLocaleDateString("en-GB", {
    timeZone: PROGRAM_DISPLAY_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Program start time for metadata and share copy (matches backend notifications). */
export function formatProgramScheduleDisplay(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleString("en-US", {
    timeZone: PROGRAM_DISPLAY_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatProgramScheduleWithTimezone(
  date: string | Date,
  timeZone = PROGRAM_DISPLAY_TIMEZONE,
  label = "UK"
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(d.getTime())) return "";

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .replace(/\s?(am|pm)/i, (_, period) => period.toUpperCase());

  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
  }).format(d);

  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);

  return `${time} (${label}), ${day}, ${datePart}`;
}

export function formatWithCommas(value: number) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-US").format(Number(value));
}

export function trimTitle(title: string, maxLength = 20): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + "...";
}

export function formatNextUsernameChange(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBankDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
