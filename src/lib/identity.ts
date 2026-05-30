export function getTipperId(): string {
  const raw = localStorage.getItem("currentUser");
  if (!raw) throw new Error("Missing currentUser");

  const id = JSON.parse(raw)?.id;
  if (!id) throw new Error("Missing tipperId");

  return id;
}

export function getEventId(): string {
  const eventId = localStorage.getItem("eventId");
  if (!eventId) throw new Error("Missing eventId");
  return eventId;
}
