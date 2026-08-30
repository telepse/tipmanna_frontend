import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export function isEventUpcomingClient(input: {
  eventDate: string;
  startTime: string;
  endTime: string;
  timeZone?: string;
}): boolean {
  if (!input.eventDate?.trim() || !input.endTime?.trim()) return true;
  const tz = input.timeZone?.trim() || "Europe/London";
  const datePart = new Date(input.eventDate).toISOString().split("T")[0];
  const [eh, em = "0"] = input.endTime.split(":");
  const wall = `${datePart} ${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`;
  const endsAt = dayjs.tz(wall, tz);
  if (!endsAt.isValid()) return true;
  return endsAt.valueOf() > Date.now();
}
