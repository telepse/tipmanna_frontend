// ------- Get event status -------- //
export const getEventStatus = (
  eventDate: string,
  startTime: string,
  endTime: string
): "Completed" | "Ongoing" | "Upcoming" => {
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
    // Check if event is within the next 24 hours for "Upcoming", otherwise "Pending"
    const timeUntilStart = startDateTime.getTime() - now.getTime();
    const hoursUntilStart = timeUntilStart / (1000 * 60 * 60);

    if (hoursUntilStart <= 24) {
      return "Upcoming";
    } else {
      return "Upcoming";
    }
  }

  return "Upcoming";
};
