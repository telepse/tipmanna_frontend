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
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    return `${minutes} min`;
  } else {
    return "0 hours";
  }
};
