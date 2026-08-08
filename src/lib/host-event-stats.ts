import type { EventSubmissionKind } from "@/lib/event-submission-kind";
import type { Event } from "@/types";

export type HostEventStats = {
  totalEventsCreated: number;
  activeEvents: number;
  completedEvents: number;
  pendingEvents: number;
  totalAmountRaised: number;
  numOfTips: number;
};

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

export function resolveEventSubmissionKind(event: Event): EventSubmissionKind {
  if (event.submissionKind) {
    return event.submissionKind;
  }

  const hasEventMeta =
    hasText(event.eventDate) ||
    hasText(event.venueName) ||
    hasText(event.venueLocation) ||
    hasText(event.eventBanner) ||
    (Array.isArray(event.performers) && event.performers.length > 0);

  if (hasEventMeta) {
    return "event_only";
  }

  return "content_only";
}

function parseScheduledWindow(event: Event): { start: Date; end: Date } | null {
  if (!hasText(event.eventDate)) return null;
  if (!hasText(event.startTime) || !hasText(event.endTime)) return null;

  const eventDateTime = new Date(event.eventDate);
  const [startHours, startMinutes] = event.startTime.split(":").map(Number);
  const [endHours, endMinutes] = event.endTime.split(":").map(Number);

  const start = new Date(eventDateTime);
  start.setHours(startHours, startMinutes, 0, 0);

  const end = new Date(eventDateTime);
  end.setHours(endHours, endMinutes, 0, 0);

  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

export function getHostEventStats(events: Event[]): HostEventStats {
  const now = new Date();

  return events.reduce<HostEventStats>(
    (acc, event) => {
      acc.totalEventsCreated++;
      acc.totalAmountRaised += event.amountRaised || 0;
      acc.numOfTips += event.numOfTips || 0;

      const isRejected = event.rejected === true;
      const isApproved = event.approved === true;

      if (!isApproved && !isRejected) {
        acc.pendingEvents++;
        return acc;
      }

      if (isRejected) {
        return acc;
      }

      const kind = resolveEventSubmissionKind(event);

      if (kind === "content_only") {
        acc.activeEvents++;
        return acc;
      }

      const window = parseScheduledWindow(event);
      if (window) {
        if (now >= window.start && now <= window.end) {
          acc.activeEvents++;
        } else if (now > window.end) {
          acc.completedEvents++;
        }
        return acc;
      }

      if (hasText(event.eventDate)) {
        const endOfDay = new Date(event.eventDate);
        endOfDay.setHours(23, 59, 59, 999);

        if (now <= endOfDay) {
          acc.activeEvents++;
        } else {
          acc.completedEvents++;
        }
      }

      return acc;
    },
    {
      totalEventsCreated: 0,
      activeEvents: 0,
      completedEvents: 0,
      pendingEvents: 0,
      totalAmountRaised: 0,
      numOfTips: 0,
    }
  );
}
