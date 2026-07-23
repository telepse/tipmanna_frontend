export type EventSubmissionKind =
  | "content_only"
  | "event_only"
  | "event_and_content";

export const EVENT_SUBMISSION_KIND_LABELS: Record<EventSubmissionKind, string> =
  {
    content_only: "Content only",
    event_only: "Event only",
    event_and_content: "Event and content",
  };

export function formatEventSubmissionKindLabel(
  value: string | null | undefined
): string {
  if (!value) {
    return "Not specified on submission";
  }

  return (
    EVENT_SUBMISSION_KIND_LABELS[value as EventSubmissionKind] ??
    value.replace(/_/g, " ")
  );
}
