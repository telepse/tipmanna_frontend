export function getGoogleCalendarUrl({
  title,
  description,
  location,
  date,
  startTime,
  endTime,
}: {
  title: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD OR ISO string
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}) {
  function normalizeDate(dateStr: string): string {
    // If it's ISO, convert to YYYY-MM-DD
    if (dateStr.includes("T")) {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        throw new Error("Invalid ISO date: " + dateStr);
      }
      return d.toISOString().split("T")?.[0]; // 👈 extract YYYY-MM-DD
    }
    return dateStr; // already plain
  }

  function combine(dateStr: string, timeStr: string): Date {
    const cleanDate = normalizeDate(dateStr);

    const [year, month, day] = cleanDate.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);

    const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date or time: ${cleanDate} ${timeStr}`);
    }

    return d;
  }

  const start = combine(date, startTime);
  const end = combine(date, endTime);

  // If end is earlier than start → assume event crosses midnight
  if (end <= start) {
    end.setUTCDate(end.getUTCDate() + 1);
  }

  const format = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")?.[0] + "Z";

  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";

  const params = new URLSearchParams({
    text: title,
    details: description,
    location,
    dates: `${format(start)}/${format(end)}`,
  });

  return `${base}&${params.toString()}`;
}
