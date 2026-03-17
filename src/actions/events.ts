"use server";

import { EventFormData, NewEventFormData } from "@/schemas";

// -------- Create event -------- //
export async function createEventAction(
  formData: EventFormData,
  token: string
) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(formData),
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to create event",
    };
  }

  return { success: true, data };
}

// -------- New create event -------- //
export async function newCreateEventAction(
  formData: NewEventFormData,
  token: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/new`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to create new event",
    };
  }

  return { success: true, data };
}

// -------- Get host events -------- //
export async function getHostEventsAction(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/me`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch my host events",
    };
  }

  return { success: true, data };
}

// -------- Create event channel -------- //
export async function createEventChannelAction(
  values: { title: string; url: string; isLive: boolean },
  eventId: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/channel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.erroor?.message || "Failed to add channel video",
    };
  }

  return { success: true, data };
}

// -------- Get host events -------- //
export async function getHostEventsTabsAction(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/tabs`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message:
        data?.error?.message || "Failed to fetch my host events for tabs",
    };
  }

  return { success: true, data };
}

// -------- Get host events for tabs by status -------- //
export async function getHostEventsForTabsByStatus(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/tabs-status`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message:
        data?.error?.message ||
        "Failed to fetch my host events for tabs by status",
    };
  }

  return { success: true, data };
}

// -------- Get host fees -------- //
export async function getHostFeesAction(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/fees`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch host fees",
    };
  }

  return { success: true, data };
}

// -------- Search events by code -------- //
export async function searchEventsByCodeAction(eventCode: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/code/${eventCode}`,
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
      message: data?.error?.message || "Failed to search events by code",
    };
  }

  return { success: true, data };
}

// -------- Search events by keyword (eventCode, eventName, organizationName) -------- //
export async function searchEventsAction(keyword: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/search?keyword=${encodeURIComponent(
      keyword
    )}`,
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
      message: data?.error?.message || "Failed to search events",
    };
  }

  return { success: true, data };
}

// -------- Get event by ID -------- //
export async function getEventByIdAction(eventId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}`,
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
      // message: data?.error?.message || "Failed to fetch event",
      data: null,
    };
  }

  return {
    success: true,
    data: {
      ...data,
      characterSets: Array.isArray(data.characterSets)
        ? data.characterSets
        : [],
      tipUsageDisclosure: Array.isArray(data.tipUsageDisclosure)
        ? data.tipUsageDisclosure
        : [],
    },
  };
}

// -------- Get event channels -------- //
export async function getEventChannels(eventId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/channels`,
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
      message: data?.error?.message || "Failed to fetch event channel videos",
    };
  }

  return { success: true, data };
}

// -------- Get event channels -------- //
export async function updateDefaultChannel(eventId: string, channelId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/channels/${channelId}/default`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId }),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to update default channel",
    };
  }

  return { success: true, data };
}

// -------- Get all host events -------- //
export async function getAllHostEvents() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to create event",
    };
  }

  return { success: true, data };
}

// -------- Get public host events -------- //
export async function getPublicHostEventsAction(
  hostName: string,
  eventCode: string
) {
  if (!hostName || !eventCode) {
    return {
      success: false,
      message: "Host name and event code are required",
    };
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/${hostName}?eventCode=${eventCode}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // ensures fresh data on every request
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch public host events",
    };
  }

  return { success: true, data };
}

// -------- Get nearby events -------- //
export async function getNearbyEventsAction(country: string) {
  if (!country) {
    return {
      success: false,
      message: "Location not detected",
      events: [],
    };
  }

  const url = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/nearby?location=${encodeURIComponent(
    country
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "No events found near you",
      events: [],
    };
  }

  return { success: true, data };
}

export async function getTotalTippedForEvent(eventId: string, token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/total/${eventId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch total tipped for event",
    };
  }

  return { success: true, data };
}

export async function getTotalTippedByAllUsersForEvent(eventId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/event/${eventId}/total-tipped/all`,
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
      message: data?.error?.message || "Failed to fetch total tipped for event",
    };
  }

  return { success: true, data };
}

export async function getTippedEventsForTipper(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/tipped`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message:
        data?.error?.message || "Failed to fetch tipped events for tipper",
    };
  }

  return { success: true, data };
}

export async function getTippedEventsForVisitor(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/tivved`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message:
        data?.error?.message || "Failed to fetch tipped events for vistor",
    };
  }

  return { success: true, data };
}

// -------- Get total amount tipped amount by tipper -------- //
export async function getTotalAmountTippedByTipper(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/total-amount-tipped`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message:
        data?.error?.message || "Failed to fetch total amount tipped by tipper",
    };
  }

  return { success: true, data };
}

// -------- Get total amount tipped amount by tipper -------- //
export async function getAmountTippedByTipper(eventId: string, token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/amount-tipped/${eventId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message:
        data?.error?.message || "Failed to fetch total amount tipped by tipper",
    };
  }

  return { success: true, data };
}

// -------- Get total amount tipped amount by visitor -------- //
export async function getAmountTippedByVisitor(eventId: string, token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/amount-tivved/${eventId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message:
        data?.error?.message ||
        "Failed to fetch total amount tipped by visitor",
    };
  }

  return { success: true, data };
}

// -------- Get total amount tipped amount by visitor -------- //
export async function getTotalAmountTippedByVisitor(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/total-amount-tivved`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message:
        data?.error?.message ||
        "Failed to fetch total amount tipped by visitor",
    };
  }

  return { success: true, data };
}

// -------- Get amount tipped amount by user -------- //
export async function getAmountTippedByUser(eventId: string, token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/amount-tipped-by-user/${eventId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch amount tipped by user",
    };
  }

  return { success: true, data };
}

// -------- Change event screen settings -------- //
export async function changeEventScreenSettings(
  values: {
    eventBackground: string;
    moneyFor: string;
    showLatestAmount: boolean;
    hideProgressBarAmount: boolean;
    tipUsageDisclosure?: Array<{
      id?: string; // Optional for updates
      usageType: "PERFORMER_WELFARE" | "HOST_WELFARE" | "COHOST_WELFARE";
      percentage: number;
      customLabel?: string | null;
    }>;
  },
  eventId: string
) {
  // Format the data to match backend expectations
  const formattedData = {
    background: values.eventBackground,
    moneyFor: values.moneyFor,
    showLatest: values.showLatestAmount,
    hideProgressAmount: values.hideProgressBarAmount,
    tipUsageDisclosure: values.tipUsageDisclosure,
  };

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/screen-settings`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedData),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message:
        data?.error?.message ||
        data?.message ||
        "Failed to change event screen settings",
    };
  }

  return { success: true, data };
}

// -------- Event attend -------- //
export async function eventAttendAction(eventId: string) {
  const ipRes = await fetch("https://api.ipify.org?format=json", {
    cache: "no-store",
  });
  const { ip } = await ipRes.json();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/attend`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId, ip }),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to attend event",
    };
  }

  return { success: true, data };
}

export async function getAllEventChannels() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/all-channels`,
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
      message: data?.error?.message || "Failed to fetch all event channels",
    };
  }

  return { success: true, data };
}

export async function getAllTopTippers() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/top-tippers`,
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
      message: data?.error?.message || "Failed to fetch top tippers",
    };
  }

  return { success: true, data };
}
