"use server";

// -------- Send message -------- //
export async function sendMessageAction(message: {
  eventId: string;
  sender: string;
  text: string;
  tip?: number;
  secondaryText?: string;
  selectedTips?: string[];
  purchasedSummary?: string;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to send message",
    };
  }

  return { success: true, data };
}

// -------- Get messages by event -------- //
export async function getMessagesByEventAction(eventId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/messages/${eventId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch messages",
    };
  }

  return { success: true, data };
}

// -------- Broadcast tip animation -------- //
export async function broadcastTipAnimation({
  eventId,
  sender,
  selectedTips,
}: {
  eventId: string;
  sender: string;
  selectedTips: string[];
}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/broadcast-tip-animation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, sender, selectedTips }),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to broadcast tip animation",
    };
  }

  return { success: true, data };
}
